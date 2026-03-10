declare var io: any;
const socket = io();

enum TileType {
  GRASS = 'GRASS',
  WALL = 'WALL',
  WATER = 'WATER',
  STAIRS_UP = 'STAIRS_UP',
  STAIRS_DOWN = 'STAIRS_DOWN'
}

interface Tile {
  type: TileType;
  isWalkable: boolean;
  x: number;
  y: number;
  floorZ: number;
}

let myUserId: number | null = null;
let currentTeam: number[] = [];

// Variable pour savoir quel étage on regarde (Caméra)
let viewingFloor = 0; 
let gameData: any = null; // Stockera les données reçues du serveur
let selectedTile: Tile | null = null;
let selectedUnitId: number | null = null;

//#region Éléments du DOM
const screens = {
    login: document.getElementById('screen-login')!,
    menu: document.getElementById('screen-menu')!,
    lobby: document.getElementById('screen-lobby')!,
    game: document.getElementById('game-ui')! // Écran de jeu
};

const inputs = {
    pseudo: document.getElementById('pseudo-input') as HTMLInputElement,
    code: document.getElementById('code-input') as HTMLInputElement
};

// Fonction pour changer d'écran
function showScreen(screenName: 'login' | 'menu' | 'lobby' | 'game') {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[screenName].classList.add('active');
}
//#endregion

//#region  --- LOGIQUE LOGIN ---
document.getElementById('btn-login')?.addEventListener('click', () => {
    const pseudo = inputs.pseudo.value;
    if (pseudo) socket.emit('login', pseudo);
});

socket.on('login_success', (user: any) => {
    myUserId = user.id;
    document.getElementById('welcome-msg')!.textContent = `Bonjour ${user.pseudo}`;
    console.log("Login réussi, mon ID est", myUserId);
    showScreen('menu');
});
//#endregion

//#region  --- LOGIQUE CRÉATION ---
document.getElementById('btn-create')?.addEventListener('click', () => {
    socket.emit('create_room');
});

socket.on('room_created', (code: string) => {
    document.getElementById('display-code')!.textContent = code;
    showScreen('lobby');
    // On s'ajoute nous-même à la liste visuelle
    addLog(`Vous avez créé la room ${code}`);
    socket.emit('get_characters');
});
//#endregion

//#region  --- LOGIQUE REJOINDRE ---
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
//#endregion

//#region  --- ÉVÉNEMENTS LOBBY ---
socket.on('player_arrived', (pseudo: string) => {
    addLog(`👋 ${pseudo} a rejoint la partie !`);
});
//#endregion

//#region  Gérer la reconnexion automatique
socket.on('reconnect_room', (data: any) => {
    console.log("Reconnexion à la room " + data.code);
    
    // 1. Mettre à jour l'affichage du code
    document.getElementById('display-code')!.textContent = data.code;
    
    // 2. Afficher le bon écran
    showScreen('lobby');
    
    // 3. Demander l'état actuel (les persos, etc.)
    socket.emit('get_characters');
    // Ici, plus tard, on demandera aussi "get_game_state" si la partie a commencé
});

socket.on('error_msg', (msg: string) => {
    alert("Erreur : " + msg);
});
//#endregion

//#region  Helper pour afficher dans la liste
function addLog(text: string) {
    const li = document.createElement('li');
    li.textContent = text;
    document.getElementById('players-list')?.appendChild(li);
}

socket.on('list_characters', (chars: any[]) => {
    const container = document.getElementById('characters-container')!;
    container.innerHTML = ""; // On vide

    chars.forEach(c => {
        const div = document.createElement('div');
        div.className = 'char-card';
        div.dataset.id = c.id; // On stocke l'ID dans le HTML
        div.innerHTML = `
            <strong>${c.name}</strong><br>
            <small>PV: ${c.base_hp} / ATK: ${c.base_atk}</small>
        `;
        
        // Clic sur la carte
        div.addEventListener('click', () => {
            console.log("Clic sur perso ID", c.id);
            socket.emit('toggle_char', c.id);
        });

        container.appendChild(div);
    });
});

socket.on('team_update', (teamIds: number[]) => {
    currentTeam = teamIds;
    console.log("Équipe mise à jour :", teamIds);
    
    // On met à jour les bordures
    document.querySelectorAll('.char-card').forEach((div: any) => {
        const id = parseInt(div.dataset.id);
        if (teamIds.includes(id)) {
            div.classList.add('selected');
        } else {
            div.classList.remove('selected');
        }
    });

    // Gestion du bouton PRÊT
    const btnReady = document.getElementById('btn-ready') as HTMLButtonElement;
    if (teamIds.length === 3) {
        btnReady.disabled = false;
        btnReady.textContent = "JE SUIS PRÊT !";
        btnReady.style.backgroundColor = "#4CAF50";
        btnReady.style.color = "white";
    } else {
        btnReady.disabled = true;
        btnReady.textContent = `Choisis encore ${3 - teamIds.length} persos`;
        btnReady.style.backgroundColor = "";
    }
});
//#endregion

//#region  LEAVE ROOM LOGIC
document.getElementById('btn-leave')?.addEventListener('click', () => {
    if (confirm("Voulez-vous vraiment quitter ?")) {
        socket.emit('leave_room');
    }
});

socket.on('left_success', () => {
    // On nettoie l'interface
    document.getElementById('players-list')!.innerHTML = "";
    document.getElementById('characters-container')!.innerHTML = "";
    // Retour au menu
    showScreen('menu');
});

socket.on('player_left', (pseudo: string) => {
    addLog(`👋 ${pseudo} est parti.`);
    // recharger la liste des joueurs ici si tu veux
});

socket.on('room_closed', (reason: string) => {
    alert(reason);
    showScreen('menu');
});
//#endregion

//#region  READY BUTTON LOGIC
document.getElementById('btn-ready')?.addEventListener('click', () => {
    socket.emit('player_ready', currentTeam);
    // On grise le bouton
    const btn = document.getElementById('btn-ready') as HTMLButtonElement;
    btn.disabled = true;
    btn.textContent = "En attente de l'adversaire...";
    btn.style.backgroundColor = "orange";
});

socket.on('opponent_ready', (pseudo: string) => {
    addLog(`⚡ ${pseudo} est prêt !`);
});

socket.on('game_start', (game: any) => {
    console.log("LA PARTIE COMMENCE !", game);
    gameData = game;
    // C'est ici qu'on change d'écran automatiquement
    showScreen('game');
    renderMap();
});
//#endregion


//#region  --- LOGIQUE DE JEU ---

function updateFloorDisplay() {
    const displaySpan = document.getElementById('current-floor-display');
    if (!displaySpan) return;

    let text = "";
    if (viewingFloor === 0) {
        text = "Rez-de-chaussée";
    } else if (viewingFloor > 0) {
        text = `Étage ${viewingFloor}`;
    } else {
        text = `Sous-sol ${Math.abs(viewingFloor)}`;
    }

    displaySpan.innerText = text;

    // BONUS : Griser les boutons si on ne peut plus bouger
    const btnUp = document.getElementById('btn-floor-up') as HTMLButtonElement;
    const btnDown = document.getElementById('btn-floor-down') as HTMLButtonElement;

    if (gameData && gameData.map) {
        // Désactive le bouton UP si on est au max
        btnUp.disabled = (viewingFloor >= gameData.map.maxZ);
        // Désactive le bouton DOWN si on est au min
        btnDown.disabled = (viewingFloor <= gameData.map.minZ);
    }
}

// Bouton MONTER (UP)
document.getElementById('btn-floor-up')?.addEventListener('click', () => {
    // SÉCURITÉ : On vérifie que gameData est chargé
    if (!gameData || !gameData.map) return;

    // LOGIQUE : Si l'étage actuel est plus petit que le max, on monte
    if (viewingFloor < gameData.map.maxZ) {
        viewingFloor++;
        renderMap();
    }
});

// Bouton DESCENDRE (DOWN)
document.getElementById('btn-floor-down')?.addEventListener('click', () => {
    if (!gameData || !gameData.map) return;

    // LOGIQUE : Si l'étage actuel est plus grand que le min (ex: -1), on descend
    if (viewingFloor > gameData.map.minZ) {
        viewingFloor--;
        renderMap();
    }
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
    console.log("Données reçues :", gameData);
    const board = document.getElementById('game-board')!;
    board.innerHTML = '';

    // SÉCURITÉ : Vérifier si les données sont bien là
    if (!gameData || !gameData.map || !gameData.map.floors) {
        console.error("Données de map invalides ou incomplètes", gameData);
        return;
    }

    // RÉCUPÉRATION DE LA GRILLE

    const floorMap = gameData.map.floors[viewingFloor.toString()];

    if (!floorMap) {
        console.error(`Étage ${viewingFloor} introuvable dans les données`, gameData.map.floors);
        return;
    }

    // On utilise les dimensions dynamiques envoyées par le serveur
    const height = gameData.map.height; 
    const width = gameData.map.width;
    // CONFIGURER LA GRILLE CSS
    const cellSize = 50; // Taille fixe des cellules en pixels
    board.style.gridTemplateColumns = `repeat(${width}, ${cellSize}px)`;
    board.style.gridTemplateRows = `repeat(${height}, ${cellSize}px)`;

    // DESSINER LA GRILLE
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            
            const cellData = floorMap.grid[y][x];
            const cellDiv = document.createElement('div');
            cellDiv.className = 'cell';

            if (selectedTile && x === selectedTile.x && y === selectedTile.y && viewingFloor === selectedTile.floorZ) {
                cellDiv.classList.add('selected');
            }

            // Styles du terrain
            if (cellData.type === TileType.WALL) cellDiv.classList.add('wall');
            if (cellData.type === TileType.WATER) cellDiv.classList.add('water');
            if (cellData.type === TileType.GRASS) cellDiv.classList.add('grass');
            if (cellData.type === TileType.STAIRS_UP) cellDiv.classList.add('stairs-up');
            if (cellData.type === TileType.STAIRS_DOWN) cellDiv.classList.add('stairs-down');

            // --- GESTION DES UNITÉS ---
            // On cherche une unité à ces coordonnées X, Y, Z
            
            const unit = gameData.units.find((u: any) => 
                Number(u.position.x) === Number(x) && 
                Number(u.position.y) === Number(y) && 
                Number(u.position.z) === Number(viewingFloor)
            );

            if (unit) {
                cellDiv.classList.add('has-unit');
                const unitDiv = document.createElement('div');
                unitDiv.className = 'unit';
                // Couleur : Bleu si c'est moi, Rouge si c'est l'autre
                unitDiv.classList.add(unit.ownerDbId === myUserId ? 'me' : 'enemy');
                
                // Si cette unité est celle qu'on a sélectionnée, on ajoute un effet visuel
                if (selectedUnitId === unit.id) {
                    unitDiv.classList.add('selected-unit');
                }

                cellDiv.appendChild(unitDiv);
            }

            // Gestion de l'événement de Clic sur la div de la cellule
            let drawingTile: Tile = { x, y, floorZ: viewingFloor, isWalkable: cellData.isWalkable, type: cellData.type };
            cellDiv.addEventListener('click', () => onCellClick(drawingTile));

            board.appendChild(cellDiv);
        }
    }
    
    // Mise à jour de l'affichage de l'étage
    document.getElementById('current-floor-display')!.innerText = (viewingFloor + 1).toString();
    updateFloorDisplay();
}

function onCellClick(tile: Tile): any {

    console.log("🎯 Clic sur Case:", { x: tile.x, y: tile.y, z: viewingFloor });
    
    // On affiche juste les positions des unités pour voir si ça correspond
    const positions = gameData.units.map((u: any) => ({ 
        id: u.id, 
        pos: u.position,
        types: { 
            x: typeof u.position.x, 
            clickX: typeof tile.x 
        } 
    }));
    console.table(positions);

    // On cherche l'unité qui serait sur la case cliquée (si elle existe)
    const unitOnCell = gameData.units.find((u: any) => 
        Number(u.position.x) === Number(tile.x) && 
        Number(u.position.y) === Number(tile.y) && 
        Number(u.position.z) === Number(viewingFloor)
    );

    // Gestion Sélection / Désélection
    
    // On clique sur une de NOS unités
    if (unitOnCell && unitOnCell.ownerDbId === myUserId) {
        console.log("🧙 unité sélectionnée:", unitOnCell.id);
        // Si c'était déjà elle la sélectionnée, on désélectionne (toggle)
        if (selectedUnitId === unitOnCell.id) {
            selectedUnitId = null;
            selectedTile = null;
        } else {
            // Sinon, on la sélectionne
            selectedUnitId = unitOnCell.id;
            selectedTile = tile; // On garde la tile pour l'affichage jaune
        }
    } 
    // On a une unité sélectionnée et on clique sur une case VIDE
    else if (selectedUnitId && !unitOnCell) {
        // Logique de mouvement
        console.log(`Tentative de déplacement de ${selectedUnitId} vers`, tile);
        socket.emit('move_unit', { unitId: selectedUnitId, tile });
        
        // On nettoie la sélection après l'ordre de mouvement
        selectedUnitId = null;
        selectedTile = null;
    }
    // Clic dans le vide sans sélection (Juste pour sélectionner la case visuellement)
    else {
        // Si on reclique sur la même case vide, on désélectionne
        if (selectedTile && selectedTile.x === tile.x && selectedTile.y === tile.y) {
            selectedTile = null;
        } else {
            selectedTile = tile;
        }
        selectedUnitId = null; // On est sûr qu'on a pas d'unité sélectionnée
    }
    console.log("Sélection actuelle:", { selectedUnitId, selectedTile });
    // On redessine
    renderMap();
}

function first_placement(): any {
    console.log("Placez vos unités sur le terrain !");
    gameData.startPlacement()
    
}

//#endregion