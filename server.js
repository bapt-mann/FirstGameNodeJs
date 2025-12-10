import express from 'express';
import http from 'http';
import { Server } from "socket.io";
import path from 'path';
import { fileURLToPath } from "url"; 

import setupSocket from "./src/network/socket.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server);

setupSocket(io);

app.use(express.static(path.join(__dirname, 'src/public')));

server.listen(3000, () => console.log("Serveur sur http://localhost:3000"));
