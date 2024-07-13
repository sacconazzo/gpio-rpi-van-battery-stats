const Gpio = require("pigpio").Gpio;
const util = require("util");
const exec = util.promisify(require("child_process").exec);
const { execSync } = require("child_process");
const db = require("../db");

const pinVCC = 26;
const pinMovement = 20;

const movementVCC = new Gpio(pinVCC, { mode: Gpio.OUTPUT });
const movementSensor = new Gpio(pinMovement, { mode: Gpio.INPUT });

const triggerSensorHost = process.env.TRIGGER_SENSOR_HOST;

let startInterval;

const shot = async ({ fileName, shutter }) => {
  const [[{ lux }]] = await db.conn.raw(
    `SELECT\
      ch4 as lux\
    FROM\
    \`adc-snaps\`\
    ORDER BY\
      id DESC\
    LIMIT 1;`
  );

  const opt = () => {
    if (shutter) return `--shutter ${shutter}`;
    if (lux > 0.1) return "";
    if (lux > 0.018) return "--shutter 5000000";
    return `--shutter 5000000 --gain ${Math.round(36 - lux * 2 * 1000)}`;
  };

  execSync(
    `libcamera-still -o ${fileName} --width 2028 --height 1520 ${opt()} --immediate`
  );
};

module.exports = {
  start: ({
    onMovement = (f) => console.log(`created: ${f}`),
    onPingTrigger = ({ ok }) => console.log(`ping completed: ${ok}`),
  }) => {
    clearInterval(startInterval);

    movementVCC.digitalWrite(1);

    startInterval = setInterval(async () => {
      try {
        const movement = movementSensor.digitalRead();

        if (movement) {
          const fileName = `./camera/${new Date().toISOString()}.jpg`;

          await shot({ fileName });

          onMovement(fileName);
        }

        try {
          const { stdout } = await exec(`ping ${triggerSensorHost} -c 1`);

          onPingTrigger({ ok: true, stdout });
        } catch (e) {
          onPingTrigger({ ok: false, stdout: e.stdout });
        }
      } catch (e) {
        console.error(e);
      }
    }, 10000);
  },

  stop: () => {
    movementVCC.digitalWrite(0);

    clearInterval(startInterval);
  },

  isRunning: () => startInterval && !startInterval?._destroyed,

  picture: async ({
    fileName = `./camera/${new Date().toISOString()}.jpg`,
    shutter,
  } = {}) => {
    await shot({ fileName, shutter });

    return fileName;
  },

  delete: async (file) => {
    return exec(`rm ${file}`);
  },
};
