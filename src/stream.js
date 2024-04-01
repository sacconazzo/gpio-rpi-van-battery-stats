const http = require("http");
const fs = require("fs");
const RaspiCam = require("raspicam");

// Configura la fotocamera
const camera = new RaspiCam({
  mode: "photo", // Imposta la modalità su 'photo' per catturare immagini
  output: "latest.jpg", // Nome del file di output
  encoding: "jpg", // Formato di encoding dell'immagine
  timeout: 0, // Nessun timeout, continua a scattare foto
});

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
io.on("connection", (socket) => {
  console.log("Client connected");
  camera.start(); // Avvia la cattura delle immagini
  camera.on("read", (err, timestamp, filename) => {
    if (err) {
      console.log(err);
    } else {
      fs.readFile(filename, (err, data) => {
        if (err) {
          console.log(err);
        } else {
          socket.emit("image", data); // Invia l'immagine al client
        }
      });
    }
  });
});

// Ascolta sulla porta 3000
server.listen(3000, () => {
  console.log("Server running on port 3000");
});
