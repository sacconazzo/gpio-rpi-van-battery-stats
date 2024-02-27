require("dotenv").config();

const axios = require("axios");
const Gpio = require("pigpio").Gpio;
const { exec, execSync } = require("child_process");
const db = require("./db");

const apiToken = process.env.API_TOKEN;

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
  edge: Gpio.EITHER_EDGE,
});

const buttonShutDown = new Gpio(pinShutDown, {
  mode: Gpio.INPUT,
  pullUpDown: Gpio.PUD_DOWN,
  edge: Gpio.EITHER_EDGE,
});

// SHARE
const share = async () => {
  pwmShare.hardwarePwmWrite(frequency, 20000);

  try {
    const [dayWeek] = await db.raw(
      "SELECT\
        date(timestamp) AS day,\
        round(avg(bm_voltage), 2) bmV,\
        round(min(bm_voltage), 2) bmVmin,\
        round(max(bm_voltage), 2) bmVmax,\
        round(avg(b1_voltage), 2) b1V,\
        round(min(b1_voltage), 2) b1Vmin,\
        round(max(b1_voltage), 2) b1Vmax,\
        round(avg(b2_voltage), 2) b2V,\
        round(min(b2_voltage), 2) b2Vmin,\
        round(max(b2_voltage), 2) b2Vmax,\
        round(sum(`b1_current` * `coeff`), 1) AS b1Ah,\
        round(sum(`b2_current` * `coeff`), 1) AS b2Ah,\
        round(avg(temperature), 1) temp,\
        round(min(temperature), 1) tempMin,\
        round(max(temperature), 1) tempMax\
      FROM\
        `battery-snaps`\
      WHERE\
        date(timestamp)> (NOW() - INTERVAL 7 DAY)\
      GROUP BY\
        day;"
    );
    const [realtime] = await db.raw(
      "SELECT\
        `timestamp`,\
        round(bm_voltage, 2) AS bmV,\
        round(b1_voltage, 2) AS b1V,\
        round(b2_voltage, 2) AS b2V,\
        round(b1_current, 1) AS b1A,\
        round(b2_current, 1) AS b2A,\
        round(temperature, 1) AS temp\
      FROM\
        `battery-snaps`\
      WHERE\
        timestamp> (NOW() - INTERVAL 61 MINUTE)\
      ORDER BY\
        id DESC\
      LIMIT 500;"
    );
    const data = {
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
  } catch (e) {
    console.log(e.message);
    pulseConnection.digitalWrite(0);
  }
  pwmShare.hardwarePwmWrite(frequency, 0);
};

setInterval(share, Number(process.env.SHARE_INTERVAL) * 1000);

share();

// BUTTONS
let waitReboot;
buttonReboot.glitchFilter(10000);
buttonReboot.on("interrupt", function (level) {
  if (level) {
    clearTimeout(waitReboot);
    setTimeout(() => pulsePress.servoWrite(pulseWidth), 500);
    waitReboot = setTimeout(
      () => exec("sudo reboot", { stdio: "inherit" }),
      2000
    );
  } else {
    clearLedButtons();
    clearTimeout(waitReboot);
  }
});
buttonShutDown.glitchFilter(10000);

let waitPowerOff;
buttonShutDown.on("interrupt", function (level) {
  if (level) {
    clearTimeout(waitPowerOff);
    setTimeout(() => {
      pulsePress.servoWrite(pulseWidth);
      letActivePowerOff = true;
    }, 500);
    waitPowerOff = setTimeout(
      () => exec("sudo poweroff", { stdio: "inherit" }),
      2000
    );
  } else {
    clearLedButtons();
    clearTimeout(waitPowerOff);
  }
});

const clearLedButtons = () => {
  const isPressed = buttonReboot.digitalRead() || buttonShutDown.digitalRead();
  if (!isPressed) pulsePress.digitalWrite(0);
};
setInterval(clearLedButtons, 100);

// END OF PROCESS
const cleanupAndExit = () => {
  buttonReboot.disableInterrupt(); // Disabilita gli interrupt prima di uscire
  buttonShutDown.disableInterrupt();
  pwmShare.hardwarePwmWrite(0, 0); // Spegni i LED rilascia il GPIO
  pulseConnection.digitalWrite(0);
  pulsePress.digitalWrite(0);
  process.exit();
};

// Gestione della terminazione del processo
process.on("SIGINT", cleanupAndExit);
process.on("SIGTERM", cleanupAndExit);