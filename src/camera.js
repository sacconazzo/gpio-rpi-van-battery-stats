const Gpio = require("pigpio").Gpio;
const { exec } = require("child_process");

const pinVCC = 26;
const pinMovement = 20;

const movementVCC = new Gpio(pinVCC, { mode: Gpio.OUTPUT });
const movementSensor = new Gpio(pinMovement, { mode: Gpio.INPUT });

if (process.env.ENABLE_BUTTONS === "true") {
  movementVCC.digitalWrite(1);
  setInterval(() => {
    const movement = movementSensor.digitalRead();
    if (movement) {
      exec(
        `libcamera-still -o ./camera/${new Date().toISOString()}.jpg --width 2028 --height 1520`,
        { stdio: "inherit" }
      );
    }
  }, 2000);
} else {
  movementVCC.digitalWrite(0);
}
