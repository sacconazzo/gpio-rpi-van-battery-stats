const http = require("http");
const { Server } = require("socket.io");
const server = http.createServer();
const io = new Server(server);

const ioc = require("socket.io-client");

server.listen(3000, () => {});
setTimeout(() => io.emit("test", 12), 2000);

const socket = ioc("http://localhost:3000");

socket.on("connect", () => {
  console.log("connected!");
});

socket.on("test", (msg) => {
  console.log("Received:", msg);
});
