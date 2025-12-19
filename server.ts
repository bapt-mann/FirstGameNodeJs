import express from 'express';
import http from 'http';
import { Server } from "socket.io";
import path from 'path';

// En TypeScript, on n'a pas besoin de mettre l'extension .js ou .ts
import setupSocket from "./src/network/socket"; 

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// On lance la configuration des sockets
setupSocket(io);

// 1. On dit à Express : "Si on te demande un fichier, regarde d'abord dans 'dist'"
// Cela permet de trouver : /public/client.js
app.use(express.static(path.join(__dirname, 'dist')));

// 2. On dit AUSSI : "Regarde dans 'public' (à la racine)"
// Cela permet de trouver : style.css, images, etc. (si tu en ajoutes plus tard)
app.use(express.static(path.join(__dirname, 'public')));

// 3. La route principale qui renvoie le HTML
app.get('/', (req, res) => {
  // On renvoie le fichier HTML source (il n'est pas dans dist, lui)
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

server.listen(3000, () => console.log("Serveur sur http://localhost:3000"));