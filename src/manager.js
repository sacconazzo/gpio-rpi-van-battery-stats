require("dotenv").config();

const axios = require("axios");
const winston = require("winston");
const cron = require("node-cron");
const Gpio = require("pigpio").Gpio;
const http = require("http");
const app = require("express")();
const { Server } = require("socket.io");
const mqtt = require("mqtt");
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
const server = http.createServer(app);
const io = new Server(server);
server.listen(3000);
const mqttClient = mqtt.connect(process.env.MQTT_HOST, {
  username: process.env.MQTT_USERNAME,
  password: process.env.MQTT_PASSWORD,
});

const share = async () => {
  pwmShare.hardwarePwmWrite(frequency, 20000);

  try {
    const system = {
      uptime: execSync("uptime").toString(),
      tempGpu: execSync("vcgencmd measure_temp")
        .toString()
        .split("=")[1]
        .split("'")[0],
      tempCpu: (
        execSync("cat /sys/class/thermal/thermal_zone0/temp").toString() / 1000
      ).toFixed(1),
    };

    const dayWeek = await db.dayWeek();

    const realtime = await db.realTime();

    app._data = {
      system,
      dayWeek,
      realtime,
    };

    await axios.post("https://api.giona.tech/domotica/battery", app._data, {
      headers: {
        "x-giona-tech": apiToken,
      },
    });

    app._dataFlat = {
      system,
      dayWeek: dayWeek[dayWeek.length - 1],
      realtime: realtime[realtime.length - 1],
    };

    io.emit("data", app._dataFlat);

    mqttClient.publish("data", JSON.stringify(app._dataFlat), {
      qos: 1,
      retain: true,
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

app.get("/data", (req, res) => res.json(app._dataFlat));

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
