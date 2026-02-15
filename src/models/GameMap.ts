// src/models/Map.ts
import { Tile } from "./Tile";
import { Floor } from "./Floor";

export class GameMap {
  width: number;
  height: number;

  // On stocke les étages dans une Map où la CLÉ est le Z (ex: -1, 0, 5)
  floors: Map<number, Floor> = new Map();

  // Limites pour savoir jusqu'où on peut aller
  minZ: number;
  maxZ: number;

  constructor(width: number, height: number, underFloorsNb: number, upperFloorsNb: number) {
    this.width = width;
    this.height = height;
    
    // On définit les bornes
    this.minZ = -underFloorsNb; // ex: -2
    this.maxZ = upperFloorsNb;  // ex: 3

    this.generateFloors();
  }

  private generateFloors() {
    // Une seule boucle qui part du plus bas vers le plus haut
    for (let z = this.minZ; z <= this.maxZ; z++) {
        const floor = new Floor(this.width, this.height, z);
        this.floors.set(z, floor); // On l'enregistre avec son Z comme clé
    }
  }

  // --- Méthodes d'accès ---

  // Vérifie si un étage existe
  floorExists(z: number): boolean {
      return this.floors.has(z);
  }

  // Récupère une case spécifique de manière sécurisée
  getTile(x: number, y: number, z: number): Tile | null {
    const floor = this.floors.get(z);
    
    // Vérifications de sécurité
    if (!floor) return null; // L'étage n'existe pas
    if (y < 0 || y >= this.height || x < 0 || x >= this.width) return null; // Hors map

    return floor.grid[y][x];
  }

  toJSON() {
    return {
      width: this.width,
      height: this.height,
      minZ: this.minZ,
      maxZ: this.maxZ,
      // On transforme la Map en Objet simple pour le transport
      floors: Object.fromEntries(this.floors)
    };
  }
}