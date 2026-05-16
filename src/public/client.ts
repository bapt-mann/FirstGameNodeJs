declare var io: any;
const socket = io();

// ================================================================
// TYPES
// ================================================================

enum TileType {
    GRASS      = 'GRASS',
    WALL       = 'WALL',
    WATER      = 'WATER',
    STAIRS_UP  = 'STAIRS_UP',
    STAIRS_DOWN = 'STAIRS_DOWN'
}

interface Tile {
    type: TileType;
    isWalkable: boolean;
    x: number;
    y: number;
    floorZ: number;
}

// ================================================================
// ÉTAT GLOBAL
// ================================================================

let myUserId: number | null = null;
let currentTeam: number[]   = [];
let viewingFloor             = 0;
let gameData: any            = null;
let selectedTile: Tile | null     = null;
let selectedUnitId: string | null = null;

// ================================================================
// ÉLÉMENTS DOM
// ================================================================

const screens = {
    login: document.getElementById('screen-login')!,
    menu:  document.getElementById('screen-menu')!,
    lobby: document.getElementById('screen-lobby')!,
    game:  document.getElementById('game-ui')!
};

const inputs = {
    pseudo:   document.getElementById('pseudo-input')   as HTMLInputElement,
    password: document.getElementById('password-input') as HTMLInputElement,
    code:     document.getElementById('code-input')     as HTMLInputElement
};

const loginError = document.getElementById('login-error')!;

function showScreen(screenName: 'login' | 'menu' | 'lobby' | 'game') {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[screenName].classList.add('active');
}

function showLoginError(msg: string) {
    loginError.textContent = msg;
    loginError.style.display = 'block';
}

function clearLoginError() {
    loginError.textContent = '';
    loginError.style.display = 'none';
}

// ================================================================
// MODE DÉVELOPPEUR
// ================================================================

const urlParams  = new URLSearchParams(window.location.search);
const devPlayer  = urlParams.get('dev'); // '1' ou '2' ou null

async function initDevMode() {
    if (!devPlayer) return;

    // Récupérer la config serveur
    const res    = await fetch('/api/config');
    const config = await res.json();

    if (!config.devMode) {
        console.warn('DEV_MODE désactivé côté serveur, paramètre ?dev ignoré.');
        return;
    }

    // Afficher le badge dev sur l'écran de login
    const badge = document.getElementById('dev-badge');
    if (badge) badge.style.display = 'block';

    const pseudo   = devPlayer === '1' ? config.devUsers.player1 : config.devUsers.player2;
    const password = config.devUsers.password;

    console.log(`🛠️  Dev mode — connexion automatique en tant que "${pseudo}"`);

    // Pré-remplir les champs (utile si auto-login échoue et que l'utilisateur doit reclicker)
    inputs.pseudo.value   = pseudo;
    inputs.password.value = password;

    // Auto-login
    socket.emit('login', { pseudo, password });
}

// Lancer le mode dev au chargement
initDevMode();

// ================================================================
// LOGIN
// ================================================================

document.getElementById('btn-login')?.addEventListener('click', () => {
    clearLoginError();
    const pseudo   = inputs.pseudo.value.trim();
    const password = inputs.password.value.trim();

    if (!pseudo || pseudo.length < 2) {
        return showLoginError("Le pseudo doit faire au moins 2 caractères.");
    }
    if (!password || password.length < 4) {
        return showLoginError("Le mot de passe doit faire au moins 4 caractères.");
    }

    socket.emit('login', { pseudo, password });
});

// Permettre la soumission avec Entrée
inputs.password?.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') document.getElementById('btn-login')?.click();
});

socket.on('login_success', async (user: any) => {
    myUserId = user.id;
    document.getElementById('welcome-msg')!.textContent = `Bonjour ${user.pseudo} !`;
    clearLoginError();
    console.log("✅ Login réussi, mon ID est", myUserId);
    showScreen('menu');

    // ── AUTO-ROOM en mode dev ──────────────────────────────────────
    if (!devPlayer) return;

    if (devPlayer === '1') {
        // Joueur 1 : crée la room
        console.log('🛠️  Dev — création automatique de la room...');
        socket.emit('create_room');

    } else if (devPlayer === '2') {
        // Joueur 2 : attend que la room existe et la rejoint
        console.log('🛠️  Dev — recherche de la room dev...');
        await autoJoinDevRoom();
    }
});

socket.on('login_error', (msg: string) => {
    showLoginError(msg);
});

// ================================================================
// AUTO-JOIN (dev=2)
// Interroge /api/dev/room jusqu'à ce qu'une room soit disponible
// ================================================================

async function autoJoinDevRoom(attempts = 0) {
    if (attempts > 15) {
        console.warn('🛠️  Dev — Aucune room dev trouvée après 15 essais. Lance d\'abord ?dev=1.');
        showLoginError('Aucune room dev disponible. Lance d\'abord l\'onglet ?dev=1.');
        return;
    }

    const res  = await fetch('/api/dev/room');
    const data = await res.json();

    if (data.code) {
        console.log(`🛠️  Dev — Rejoindre la room ${data.code}`);
        socket.emit('join_room', data.code);
    } else {
        // Pas encore de room, on réessaie dans 1 seconde
        setTimeout(() => autoJoinDevRoom(attempts + 1), 1000);
    }
}

// ================================================================
// CRÉATION DE ROOM
// ================================================================

document.getElementById('btn-create')?.addEventListener('click', () => {
    socket.emit('create_room');
});

socket.on('room_created', (code: string) => {
    document.getElementById('display-code')!.textContent = code;
    showScreen('lobby');
    addLog(`Vous avez créé la room ${code}`);
    socket.emit('get_characters');
});

// ================================================================
// REJOINDRE UNE ROOM
// ================================================================

document.getElementById('btn-join')?.addEventListener('click', () => {
    const code = inputs.code.value.toUpperCase();
    if (code) socket.emit('join_room', code);
});

socket.on('room_joined', (code: string) => {
    document.getElementById('display-code')!.textContent = code;
    showScreen('lobby');
    addLog(`Vous avez rejoint la room ${code}`);
    socket.emit('get_characters');
});

// ================================================================
// LOBBY
// ================================================================

socket.on('player_arrived', (pseudo: string) => {
    addLog(`👋 ${pseudo} a rejoint la partie !`);
});

socket.on('reconnect_room', (data: any) => {
    console.log("🔄 Reconnexion à la room " + data.code);
    document.getElementById('display-code')!.textContent = data.code;
    showScreen('lobby');
    socket.emit('get_characters');
});

socket.on('error_msg', (msg: string) => {
    alert("Erreur : " + msg);
});

function addLog(text: string) {
    const li = document.createElement('li');
    li.textContent = text;
    document.getElementById('players-list')?.appendChild(li);
}

// ================================================================
// SÉLECTION DES PERSONNAGES
// ================================================================

socket.on('list_characters', (chars: any[]) => {
    const container = document.getElementById('characters-container')!;
    container.innerHTML = "";

    chars.forEach(c => {
        const div = document.createElement('div');
        div.className    = 'char-card';
        div.dataset.id   = c.id;
        div.innerHTML    = `
            <strong>${c.name}</strong><br>
            <small>PV: ${c.base_hp} / ATK: ${c.base_atk}</small>
        `;
        div.addEventListener('click', () => socket.emit('toggle_char', c.id));
        container.appendChild(div);
    });
});

socket.on('team_update', (teamIds: number[]) => {
    currentTeam = teamIds;

    document.querySelectorAll('.char-card').forEach((div: any) => {
        const id = parseInt(div.dataset.id);
        div.classList.toggle('selected', teamIds.includes(id));
    });

    const btnReady = document.getElementById('btn-ready') as HTMLButtonElement;
    if (teamIds.length === 3) {
        btnReady.disabled         = false;
        btnReady.textContent      = "JE SUIS PRÊT !";
        btnReady.style.backgroundColor = "#4CAF50";
        btnReady.style.color      = "white";
    } else {
        btnReady.disabled         = true;
        btnReady.textContent      = `Choisis encore ${3 - teamIds.length} perso(s)`;
        btnReady.style.backgroundColor = "";
    }
});

// ================================================================
// QUITTER LA ROOM
// ================================================================

document.getElementById('btn-leave')?.addEventListener('click', () => {
    if (confirm("Voulez-vous vraiment quitter ?")) {
        socket.emit('leave_room');
    }
});

socket.on('left_success', () => {
    document.getElementById('players-list')!.innerHTML      = "";
    document.getElementById('characters-container')!.innerHTML = "";
    showScreen('menu');
});

socket.on('player_left', (pseudo: string) => {
    addLog(`👋 ${pseudo} est parti.`);
});

socket.on('room_closed', (reason: string) => {
    alert(reason);
    showScreen('menu');
});

// ================================================================
// PRÊT
// ================================================================

document.getElementById('btn-ready')?.addEventListener('click', () => {
    socket.emit('player_ready', currentTeam);
    const btn = document.getElementById('btn-ready') as HTMLButtonElement;
    btn.disabled              = true;
    btn.textContent           = "En attente de l'adversaire...";
    btn.style.backgroundColor = "orange";
});

socket.on('opponent_ready', (pseudo: string) => {
    addLog(`⚡ ${pseudo} est prêt !`);
});

socket.on('game_start', (game: any) => {
    console.log("🎮 LA PARTIE COMMENCE !", game);
    gameData = game;
    showScreen('game');
    renderMap();
});

// ================================================================
// RENDU DE LA MAP
// ================================================================

function updateFloorDisplay() {
    const displaySpan = document.getElementById('current-floor-display');
    if (!displaySpan) return;

    if (viewingFloor === 0)        displaySpan.innerText = "Rez-de-chaussée";
    else if (viewingFloor > 0)     displaySpan.innerText = `Étage ${viewingFloor}`;
    else                           displaySpan.innerText = `Sous-sol ${Math.abs(viewingFloor)}`;

    if (gameData?.map) {
        (document.getElementById('btn-floor-up')   as HTMLButtonElement).disabled = viewingFloor >= gameData.map.maxZ;
        (document.getElementById('btn-floor-down') as HTMLButtonElement).disabled = viewingFloor <= gameData.map.minZ;
    }
}

document.getElementById('btn-floor-up')?.addEventListener('click', () => {
    if (!gameData?.map || viewingFloor >= gameData.map.maxZ) return;
    viewingFloor++;
    renderMap();
});

document.getElementById('btn-floor-down')?.addEventListener('click', () => {
    if (!gameData?.map || viewingFloor <= gameData.map.minZ) return;
    viewingFloor--;
    renderMap();
});

socket.on('update_game', (game: any) => {
    gameData = game;
    renderMap();
});

socket.on('first_placement', (game: any) => {
    gameData = game;
    renderMap();
    alert("Placez vos unités sur le terrain !");
});

function renderMap() {
    const board = document.getElementById('game-board')!;
    board.innerHTML = '';

    if (!gameData?.map?.floors) {
        console.error("Données de map invalides", gameData);
        return;
    }

    const floorMap = gameData.map.floors[viewingFloor.toString()];
    if (!floorMap) {
        console.error(`Étage ${viewingFloor} introuvable`, gameData.map.floors);
        return;
    }

    const { height, width } = gameData.map;
    const cellSize = 50;
    board.style.gridTemplateColumns = `repeat(${width}, ${cellSize}px)`;
    board.style.gridTemplateRows    = `repeat(${height}, ${cellSize}px)`;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const cellData = floorMap.grid[y][x];
            const cellDiv  = document.createElement('div');
            cellDiv.className = 'cell';

            if (selectedTile?.x === x && selectedTile?.y === y && selectedTile?.floorZ === viewingFloor) {
                cellDiv.classList.add('selected');
            }

            // Terrain
            const typeClass: Record<string, string> = {
                [TileType.WALL]:        'wall',
                [TileType.WATER]:       'water',
                [TileType.GRASS]:       'grass',
                [TileType.STAIRS_UP]:   'stairs-up',
                [TileType.STAIRS_DOWN]: 'stairs-down',
            };
            if (typeClass[cellData.type]) cellDiv.classList.add(typeClass[cellData.type]);

            // Unité sur cette case ?
            const unit = gameData.units.find((u: any) =>
                Number(u.position.x) === x &&
                Number(u.position.y) === y &&
                Number(u.position.z) === viewingFloor
            );

            if (unit) {
                cellDiv.classList.add('has-unit');
                const unitDiv = document.createElement('div');
                unitDiv.className = 'unit';
                unitDiv.classList.add(unit.ownerId === myUserId ? 'me' : 'enemy');
                if (selectedUnitId === unit.id) unitDiv.classList.add('selected-unit');
                cellDiv.appendChild(unitDiv);
            }

            const tile: Tile = { x, y, floorZ: viewingFloor, isWalkable: cellData.isWalkable, type: cellData.type };
            cellDiv.addEventListener('click', () => onCellClick(tile));
            board.appendChild(cellDiv);
        }
    }

    updateFloorDisplay();
}

function onCellClick(tile: Tile) {
    const unitOnCell = gameData.units.find((u: any) =>
        Number(u.position.x) === Number(tile.x) &&
        Number(u.position.y) === Number(tile.y) &&
        Number(u.position.z) === Number(viewingFloor)
    );

    if (unitOnCell && unitOnCell.ownerId === myUserId) {
        // Sélection / désélection de notre unité
        if (selectedUnitId === unitOnCell.id) {
            selectedUnitId = null;
            selectedTile   = null;
        } else {
            selectedUnitId = unitOnCell.id;
            selectedTile   = tile;
        }
    } else if (selectedUnitId && !unitOnCell) {
        // Déplacement vers case vide
        socket.emit('move_unit', { unitId: selectedUnitId, tile });
        selectedUnitId = null;
        selectedTile   = null;
    } else {
        // Sélection d'une case vide (toggle)
        if (selectedTile?.x === tile.x && selectedTile?.y === tile.y) {
            selectedTile = null;
        } else {
            selectedTile = tile;
        }
        selectedUnitId = null;
    }

    renderMap();
}
