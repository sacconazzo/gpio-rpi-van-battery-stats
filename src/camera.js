const Gpio = require("pigpio").Gpio;
const util = require("util");
const exec = util.promisify(require("child_process").exec);
const { execSync } = require("child_process");
const db = require("./db");

const pinVCC = 26;
const pinMovement = 20;

const movementVCC = new Gpio(pinVCC, { mode: Gpio.OUTPUT });
const movementSensor = new Gpio(pinMovement, { mode: Gpio.INPUT });

let startInterval;

const shot = async (fileName) => {
  const [[{ lux }]] = await db.raw(
    `SELECT\
      ch4 as lux\
    FROM\
    \`adc-snaps\`\
    ORDER BY\
      id DESC\
    LIMIT 1;`
  );

  const opt =
    lux < 0.1
      ? lux < 0.025
        ? "--shutter 10000000 --gain 5"
        : "--shutter 5000000 --gain 3"
      : "";

  execSync(
    `libcamera-still -o ${fileName} --width 2028 --height 1520 ${opt} --immediate`
  );
};

module.exports = {
  start: ({ onMovement = (f) => console.log(`created: ${f}`) }) => {
    clearInterval(startInterval);

    movementVCC.digitalWrite(1);

    startInterval = setInterval(async () => {
      try {
        const movement = movementSensor.digitalRead();

        if (movement) {
          const fileName = `./camera/${new Date().toISOString()}.jpg`;

          await shot(fileName);

          onMovement(fileName);
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

  picture: async ({
    fileName = `./camera/${new Date().toISOString()}.jpg`,
  } = {}) => {
    await shot(fileName);

    return fileName;
  },

  delete: async (file) => {
    return exec(`rm ${file}`);
  },
};
