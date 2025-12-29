// Une case du terrain
interface Tile {
  type: 'GRASS' | 'WALL' | 'WATER' | 'STAIRS_UP' | 'STAIRS_DOWN';
  isWalkable: boolean;
}

// Dans ta classe Game
export class Map {
  // ...
  width = 10;
  height = 15;
  floors = 3; // Nombre d'étages

  // map[etage][y][x]
  map: Tile[][][] = []; 

  constructor(width: number, height: number, floors: number) {
    this.width = width;
    this.height = height;
    this.floors = floors;
    this.generateMap();
  }

  generateMap() {
    // Initialisation vide
    for (let z = 0; z < this.floors; z++) {
      this.map[z] = [];
      for (let y = 0; y < this.height; y++) {
        this.map[z][y] = [];
        for (let x = 0; x < this.width; x++) {
          this.map[z][y][x] = { type: 'GRASS', isWalkable: true };
        }
      }
    }
    // Ici tu ajouteras des murs et des escaliers manuellement ou via algo
  }
}