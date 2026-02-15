import express from 'express';
import http from 'http';
import { Server } from "socket.io";
import path from 'path';
import setupSocket from "./network/socket"; 

const app = express();
const server = http.createServer(app);
const io = new Server(server);

setupSocket(io);

// ==================================================================
// 1. DÉFINITION DES CHEMINS (Simplifiée)
// ==================================================================

// __dirname = le dossier où se trouve server.js (c'est-à-dire 'dist')

// Le dossier contenant le JS compilé est juste à côté : 'dist/public'
const distPublic = path.join(__dirname, 'public');

// Le dossier contenant le HTML/CSS est un cran au-dessus : 'public' à la racine
const rootPublic = path.join(__dirname, '../public');

// --- DEBUG : Affiche les chemins dans la console au démarrage ---
console.log("Dossier JS compilé servi :", distPublic);
console.log("Dossier HTML/CSS servi :", rootPublic);

// ==================================================================
// 2. CONFIGURATION STATIC
// ==================================================================

// On sert d'abord le JS compilé (client.js)
app.use(express.static(distPublic));

// Ensuite le HTML/CSS (index.html, style.css)
app.use(express.static(rootPublic));

// ==================================================================
// 3. ROUTES
// ==================================================================

app.get('/', (req, res) => {
  res.sendFile(path.join(rootPublic, 'index.html'));
});

// ==================================================================
// 4. LANCEMENT
// ==================================================================

server.listen(3000, () => {
    console.log("✅ Serveur lancé sur http://localhost:3000");
});