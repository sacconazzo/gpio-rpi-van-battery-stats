const io = require("socket.io-client");

const socket = io("http://10.8.0.5:3000");

socket.on("connect", () => {
  console.log("connected!");
});

socket.on("data", (msg) => {
  console.log("Received:", msg);
});
