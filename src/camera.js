const Gpio = require("pigpio").Gpio;
const { execSync } = require("child_process");

const pinVCC = 26;
const pinMovement = 20;

const movementVCC = new Gpio(pinVCC, { mode: Gpio.OUTPUT });
const movementSensor = new Gpio(pinMovement, { mode: Gpio.INPUT });

let startInterval;

const shot = (fileName) => {
  execSync(
    `libcamera-still -o ${fileName}day --width 2028 --height 1520 --immediate`
  );
  const sizeDay = Number(
    execSync(`stat ${fileName}day | grep Size`).toString().split(" ")[3]
  );

  execSync(
    `libcamera-still -o ${fileName}night --width 2028 --height 1520 --shutter 5000000 --gain 1 --immediate`
  );
  const sizeNight = Number(
    execSync(`stat ${fileName}night | grep Size`).toString().split(" ")[3]
  );

  execSync(`rm ${fileName}${sizeDay < sizeNight ? "day" : "night"}`);

  execSync(
    `mv ${fileName}${sizeDay < sizeNight ? "night" : "day"} ${fileName}`
  );
};

module.exports = {
  start: ({ onMovement = (f) => console.log(`created: ${f}`) }) => {
    clearInterval(startInterval);

    movementVCC.digitalWrite(1);

    startInterval = setInterval(() => {
      try {
        const movement = movementSensor.digitalRead();

        if (movement) {
          const fileName = `./camera/${new Date().toISOString()}.jpg`;

          shot(fileName);

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
    shot(fileName);

    return fileName;
  },

  delete: (file) => {
    execSync(`rm ${file}`);
  },
};
