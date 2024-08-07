require("dotenv").config();

const axios = require("axios");
const winston = require("winston");
const cron = require("node-cron");
const Gpio = require("pigpio").Gpio;
const { exec, execSync } = require("child_process");
const db = require("./db");
const telegram = require("./telegram");
const { calibrate, calibrateAI } = require("./calibrate");

const apiToken = process.env.API_TOKEN;

const shareInterval = process.env.SHARE_INTERVAL || "* * * * *";
const recalibrateInterval = process.env.RECALIBRATE_INTERVAL || "0 0-9 * * *";
const recalAIInterval = process.env.RECALIBRATE_AI_INTERVAL;

// Imposta il numero del pin GPIO che desideri utilizzare
const pinShare = 18;
const pinConnection = 15;

const pinReboot = 24;
const pinShutDown = 23;
const pinPress = 25;

// Imposta la frequenza del segnale PWM in Hz
const frequency = 1000;
const dutyCycle = 0.5;

// Crea un oggetto Gpio per il pin specificato
const pwmShare = new Gpio(pinShare, { mode: Gpio.OUTPUT });
const pulseConnection = new Gpio(pinConnection, { mode: Gpio.OUTPUT });
const pulsePress = new Gpio(pinPress, { mode: Gpio.OUTPUT });

// Imposta la frequenza del PWM
pwmShare.hardwarePwmWrite(frequency, 0); // duty cycle, tra 0 (0%) e 1000000 (100%)

const period = (1 / frequency) * 1e6; // Converti secondi in microsecondi
const pulseWidth = dutyCycle * period;
pulseConnection.digitalWrite(0);

const buttonReboot = new Gpio(pinReboot, {
  mode: Gpio.INPUT,
  pullUpDown: Gpio.PUD_DOWN,
});

const buttonShutDown = new Gpio(pinShutDown, {
  mode: Gpio.INPUT,
  pullUpDown: Gpio.PUD_DOWN,
});

// SHARE
const share = async () => {
  pwmShare.hardwarePwmWrite(frequency, 20000);

  try {
    const system = {
      uptime: execSync("uptime").toString(),
      temp: Number(
        execSync("vcgencmd measure_temp").toString().split("=")[1].split("'")[0]
      ),
    };

    const [dayWeek] = await db.conn.raw(
      `SELECT\
        date(CONVERT_TZ(timestamp, 'UTC', '${process.env.DB_TIMEZONE}')) AS day,\
        round(avg(bm_voltage), 2) bmV,\
        round(min(bm_voltage), 2) bmVmin,\
        round(max(bm_voltage), 2) bmVmax,\
        round(avg(b1_voltage), 2) b1V,\
        round(min(b1_voltage), 2) b1Vmin,\
        round(max(b1_voltage), 2) b1Vmax,\
        round(avg(b2_voltage), 2) b2V,\
        round(min(b2_voltage), 2) b2Vmin,\
        round(max(b2_voltage), 2) b2Vmax,\
        round(sum(b1_current * coeff), 1) AS b1Ah,\
        round(sum(b2_current * coeff), 1) AS b2Ah,\
        round(sum(b1_current * coeff * b1_voltage), 1) AS b1Wh,\
        round(sum(b2_current * coeff * b2_voltage), 1) AS b2Wh,\
        round(avg(temperature), 2) temp,\
        round(min(temperature), 2) tempMin,\
        round(max(temperature), 2) tempMax\
      FROM\
        \`battery-snaps\`\
      WHERE\
        date(timestamp)> (NOW() - INTERVAL 14 DAY)\
        and b1_voltage > 9\
	      and b2_voltage > 9\
	      and bm_voltage > 9\
      GROUP BY\
        day;`
    );

    const [realtime] = await db.conn.raw(
      `SELECT\
        CONVERT_TZ(timestamp, 'UTC', '${process.env.DB_TIMEZONE}') as timestamp,\
        round(bm_voltage, 2) AS bmV,\
        round(b1_voltage, 2) AS b1V,\
        round(b2_voltage, 2) AS b2V,\
        round(b1_current, 1) AS b1A,\
        round(b2_current, 1) AS b2A,\
        round(temperature, 2) AS temp\
      FROM\
      \`battery-snaps\`\
      WHERE\
        timestamp> (NOW() - INTERVAL ${process.env.REALTIME_MINUTES} MINUTE)\
        and b1_voltage > 9\
	      and b2_voltage > 9\
	      and bm_voltage > 9\
      ORDER BY\
        id ASC;`
      // LIMIT 500;
    );

    const data = {
      system,
      dayWeek,
      realtime,
    };
    await axios.post("https://api.giona.tech/domotica/battery", data, {
      headers: {
        "x-giona-tech": apiToken,
      },
    });

    console.log("stored data");

    pulseConnection.servoWrite(pulseWidth);

    telegram.start({
      onCalibrateRequest: calibrate,
      onCalibrateAIRequest: calibrateAI,
    });
  } catch (e) {
    console.log(e.message);
    pulseConnection.digitalWrite(0);
  }
  pwmShare.hardwarePwmWrite(frequency, 0);
};

cron.schedule(shareInterval, share);
share();

// BUTTONS
if (process.env.ENABLE_BUTTONS === "true") {
  let waitReboot;
  buttonReboot.enableInterrupt(Gpio.EITHER_EDGE);
  buttonReboot.glitchFilter(10000);
  buttonReboot.on("interrupt", function (level) {
    if (level) {
      clearTimeout(waitReboot);
      setTimeout(() => pulsePress.servoWrite(pulseWidth), 500);
      waitReboot = setTimeout(() => exec("sudo reboot"), 2000);
    } else {
      clearLedButtons();
      clearTimeout(waitReboot);
    }
  });

  let waitPowerOff;
  buttonShutDown.enableInterrupt(Gpio.EITHER_EDGE);
  buttonShutDown.glitchFilter(10000);
  buttonShutDown.on("interrupt", function (level) {
    if (level) {
      clearTimeout(waitPowerOff);
      setTimeout(() => {
        pulsePress.servoWrite(pulseWidth);
        letActivePowerOff = true;
      }, 500);
      waitPowerOff = setTimeout(() => exec("sudo poweroff"), 2000);
    } else {
      clearLedButtons();
      clearTimeout(waitPowerOff);
    }
  });

  const clearLedButtons = () => {
    const isPressed =
      buttonReboot.digitalRead() || buttonShutDown.digitalRead();
    if (!isPressed) pulsePress.digitalWrite(0);
  };
  setInterval(clearLedButtons, 100);
}

// CRON - re-calibrating
cron.schedule(recalibrateInterval, calibrate);
if (recalAIInterval) cron.schedule(recalAIInterval, calibrateAI);

// LOGGER
const logger = winston.createLogger({
  transports: [
    new winston.transports.File({
      filename: "logs.log",
      level: "info", // log level
      format: winston.format.combine(
        winston.format.timestamp(), // add timestamp
        winston.format.json()
      ),
    }),
  ],
});

// override console methods
["log", "error", "warn", "info"].forEach((method) => {
  console[method] = (m, ...a) =>
    logger[method === "log" ? "info" : method](m, ...a);
});

// END OF PROCESS
const cleanupAndExit = () => {
  buttonReboot.disableInterrupt(); // Disable interrupt
  buttonShutDown.disableInterrupt();
  pwmShare.hardwarePwmWrite(0, 0); // turn off leds
  pulseConnection.digitalWrite(0);
  pulsePress.digitalWrite(0);
  telegram.stop();
  process.exit();
};

// end of process events
process.on("SIGINT", cleanupAndExit);
process.on("SIGTERM", cleanupAndExit);
