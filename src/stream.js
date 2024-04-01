const http = require("http");
const fs = require("fs");
const fsp = require("fs/promises");
const campera = require("./camera");

// Avvia il server HTTP
const server = http.createServer((req, res) => {
  fs.readFile(__dirname + "/stream.html", (err, data) => {
    if (err) {
      res.writeHead(500);
      return res.end("Error loading stream.html");
    }
    res.writeHead(200);
    res.end(data);
  });
});

const io = require("socket.io")(server, {
  allowEIO3: true, // false by default
  cors: {
    origin: "*",
  },
});

// Avvia il server di streaming
io.on("connection", async (socket) => {
  console.log("Client connected");

  // await socket.emit("image", data); // Invia l'immagine al client
});

setInterval(async () => {
  const source = await campera.picture();
  const data = await fsp.readFile(source, "base64");

  await io.emit("image", data); // Invia l'immagine al client

  await campera.delete(source);
}, 5000);

// Ascolta sulla porta 3000
server.listen(3000, () => {
  console.log("Server running on port 3000");
});
