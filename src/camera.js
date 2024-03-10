const Gpio = require("pigpio").Gpio;
const util = require("util");
const exec = util.promisify(require("child_process").exec);
const { execSync } = require("child_process");

const pinVCC = 26;
const pinMovement = 20;

const movementVCC = new Gpio(pinVCC, { mode: Gpio.OUTPUT });
const movementSensor = new Gpio(pinMovement, { mode: Gpio.INPUT });

let startInterval;

const shot = async (fileName) => {
  await exec(
    `libcamera-still -o ${fileName}day --width 2028 --height 1520 --immediate`
  );
  const sizeDay = Number(
    execSync(`stat ${fileName}day | grep Size`).toString().split(" ")[3]
  );

  await exec(
    `libcamera-still -o ${fileName}night --width 2028 --height 1520 --shutter 5000000 --gain 3 --immediate`
  );
  const sizeNight = Number(
    execSync(`stat ${fileName}night | grep Size`).toString().split(" ")[3]
  );

  await exec(`rm ${fileName}${sizeDay < sizeNight ? "day" : "night"}`);

  await exec(
    `mv ${fileName}${sizeDay < sizeNight ? "night" : "day"} ${fileName}`
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
