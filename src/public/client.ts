declare var io: any;
const socket = io();

interface Tile {
  type: 'GRASS' | 'WALL' | 'WATER' | 'STAIRS_UP' | 'STAIRS_DOWN';
  isWalkable: boolean;
  x: number;
  y: number;
  z: number;
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
            socket.emit('toggle_char', c.id);
        });

        container.appendChild(div);
    });
});

socket.on('team_update', (teamIds: number[]) => {
    currentTeam = teamIds;
    
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
    socket.emit('player_ready');
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

// Boutons pour changer d'étage 
document.getElementById('btn-floor-up')?.addEventListener('click', () => {
    if (viewingFloor < gameData.floors - 1) {
        viewingFloor++;
        renderMap();
    }
});

document.getElementById('btn-floor-down')?.addEventListener('click', () => {
    if (viewingFloor > 0) {
        viewingFloor--;
        renderMap();
    }
});

socket.on('game_update', (game: any) => {
    gameData = game;
    renderMap();
});

socket.on('first_placement', (game: any) => {
    gameData = game;
    for (const unit of gameData.units) {
        if (unit.ownerDbId === myUserId) {
            unit.position.x = 3;
            unit.position.y = 0;
            unit.position.z = 0;
            break;
        }
    }
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
    const height = gameData.map.height; // 15
    const width = gameData.map.width;   // 10
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

            if (selectedTile && x === selectedTile.x && y === selectedTile.y && viewingFloor === selectedTile.z) {
                cellDiv.classList.add('selected');
            }

            // Styles du terrain
            if (cellData.type === 'WALL') cellDiv.classList.add('wall');
            if (cellData.type === 'STAIRS_UP') cellDiv.classList.add('stairs-up');
            if (cellData.type === 'STAIRS_DOWN') cellDiv.classList.add('stairs-down');

            // --- GESTION DES UNITÉS ---
            // On cherche une unité à ces coordonnées X, Y, Z
            const unit = gameData.units.find((u: any) => 
                u.position.x === x && 
                u.position.y === y && 
                u.position.z === viewingFloor
            );

            if (unit) {
                const unitDiv = document.createElement('div');
                unitDiv.className = 'unit';
                // Couleur : Bleu si c'est moi, Rouge si c'est l'autre
                unitDiv.classList.add(unit.ownerDbId === myUserId ? 'me' : 'enemy');
                
                // Si cette unité est celle qu'on a sélectionnée, on ajoute un effet visuel
                // if (selectedUnitId === unit.id) {
                //     unitDiv.classList.add('selected-unit');
                // }

                cellDiv.appendChild(unitDiv);
            }

            // Gestion du Clic (Déplacement ou Sélection)
            let drawingTile: Tile = { x, y, z: viewingFloor, isWalkable: cellData.isWalkable, type: cellData.type };
            cellDiv.addEventListener('click', () => onCellClick(drawingTile));

            board.appendChild(cellDiv);
        }
    }
    
    // Mise à jour de l'affichage de l'étage
    document.getElementById('current-floor-display')!.innerText = (viewingFloor + 1).toString();
}


function onCellClick(tile: Tile): any {
    console.log(`Clic sur ${tile.x}, ${tile.y}`);

    // 1. On enregistre la nouvelle sélection
    // Si on reclique sur la même case, on peut désélectionner (optionnel)
    if (selectedTile && selectedTile.x === tile.x && selectedTile.y === tile.y && viewingFloor === selectedTile.z) {
        selectedTile = null; // Désélectionne
        selectedUnitId = null;           // On oublie l'unité aussi
    } else {
        selectedTile = tile; // Nouvelle sélection
    }

    // 2. Gestion de l'unité (Ton code existant)
    // On doit retrouver l'unité à cet endroit pour savoir si on sélectionne un perso
    // ou si on essaie de bouger
    const unitOnCell = gameData.units.find((u: any) => 
        u.position.x === tile.x && u.position.y === tile.y && u.position.z === viewingFloor
    );

    if (unitOnCell && unitOnCell.ownerDbId === myUserId) {
        selectedUnitId = unitOnCell.id;
    } else if (selectedUnitId && !unitOnCell) {
        // Logique de mouvement (socket.emit...)
        socket.emit('move_unit', { unitId: selectedUnitId, tile });
        selectedUnitId = null;
        selectedTile = null; // On désélectionne après le mouvement
    }

    // 3. IMPORTANT : On redessine la grille pour appliquer la classe .selected visuellement
    renderMap();

}

function first_placement(): any {
    console.log("Placez vos unités sur le terrain !");
    gameData.startPlacement()
    
}

//#endregion