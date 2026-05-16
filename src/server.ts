import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server } from "socket.io";
import path from 'path';
import setupSocket from "./network/socket";
import { runMigrations } from './migrations/runner';

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// ==================================================================
// 1. MIDDLEWARES
// ==================================================================

app.use(express.json());

// ==================================================================
// 2. ÉTAT DEV (room partagée entre les deux onglets dev)
// ==================================================================

// En mode dev, on garde le code de la room active en mémoire
// pour que dev=2 puisse rejoindre automatiquement
export let devRoomCode: string | null = null;
export function setDevRoomCode(code: string | null) {
    devRoomCode = code;
}

// ==================================================================
// 3. ROUTES API
// ==================================================================

// Configuration publique (mode dev, etc.)
app.get('/api/config', (_req, res) => {
    const devMode = process.env.DEV_MODE === 'true';
    res.json({
        devMode,
        // On expose les infos de connexion dev UNIQUEMENT si DEV_MODE est actif
        devUsers: devMode ? {
            player1:  process.env.DEV_USER_1 || 'Dev1',
            player2:  process.env.DEV_USER_2 || 'Dev2',
            password: process.env.DEV_PASSWORD || 'devpass123'
        } : null
    });
});

// Retourne la room dev active (pour que dev=2 puisse rejoindre)
app.get('/api/dev/room', (_req, res) => {
    if (process.env.DEV_MODE !== 'true') {
        return res.status(403).json({ error: 'Dev mode désactivé' });
    }
    res.json({ code: devRoomCode });
});

// ==================================================================
// 4. FICHIERS STATIQUES
// ==================================================================

const distPublic = path.join(__dirname, 'public');
const rootPublic = path.join(__dirname, '../public');

app.use(express.static(distPublic));
app.use(express.static(rootPublic));

app.get('/', (_req, res) => {
    res.sendFile(path.join(rootPublic, 'index.html'));
});

// ==================================================================
// 5. SOCKET.IO
// ==================================================================

setupSocket(io);

// ==================================================================
// 6. DÉMARRAGE (migrations d'abord, serveur ensuite)
// ==================================================================

const PORT = parseInt(process.env.PORT || '3000', 10);

async function start() {
    try {
        await runMigrations();
        server.listen(PORT, () => {
            console.log(`✅ Serveur lancé sur http://localhost:${PORT}`);
            if (process.env.DEV_MODE === 'true') {
                console.log(`🛠️  Mode DEV actif`);
                console.log(`   → Tab 1 : http://localhost:${PORT}?dev=1`);
                console.log(`   → Tab 2 : http://localhost:${PORT}?dev=2`);
            }
        });
    } catch (err) {
        console.error('❌ Impossible de démarrer le serveur :', err);
        process.exit(1);
    }
}

start();
