const Gpio = require("pigpio").Gpio;
const { execSync } = require("child_process");

const pinVCC = 26;
const pinMovement = 20;

const movementVCC = new Gpio(pinVCC, { mode: Gpio.OUTPUT });
const movementSensor = new Gpio(pinMovement, { mode: Gpio.INPUT });

let startInterval;

module.exports = {
  start: ({ onMovement = (f) => console.log(`created: ${f}`) }) => {
    clearInterval(startInterval);

    movementVCC.digitalWrite(1);

    startInterval = setInterval(() => {
      try {
        const movement = movementSensor.digitalRead();

        if (movement) {
          const fileName = `./camera/${new Date().toISOString()}.jpg`;

          execSync(
            `libcamera-still -o ${fileName} --width 2028 --height 1520 --shutter 1000000 --gain 1 --immediate`
          );

          onMovement(fileName);
        }
      } catch (e) {
        console.error(e);
      }
    }, 4000);
  },

  stop: () => {
    movementVCC.digitalWrite(0);

    clearInterval(startInterval);
  },

  picture: ({ fileName = `./camera/${new Date().toISOString()}.jpg` } = {}) => {
    execSync(
      `libcamera-still -o ${fileName} --width 2028 --height 1520 --shutter 1000000 --gain 1 --immediate`
    );

    return fileName;
  },

  delete: (file) => {
    execSync(`rm ${file}`);
  },
};
