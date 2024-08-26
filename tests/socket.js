const io = require("socket.io-client");

const socket = io("http://localhost:3000");

socket.on("connect", () => {
  console.log("connected!");
});

socket.on("data", (msg) => {
  console.log("Received:", msg);
});
