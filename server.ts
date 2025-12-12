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

// Gestion des fichiers statiques
// Note : Si ton server.ts est à la racine, 'src/public' est correct.
// Si tu as déplacé ce fichier DANS le dossier src, il faudra utiliser path.join(__dirname, 'public')
app.use(express.static(path.join(__dirname, 'src/public')));
server.listen(3000, () => console.log("Serveur sur http://localhost:3000"));