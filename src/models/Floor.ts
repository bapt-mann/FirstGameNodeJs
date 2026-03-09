// src/models/Floor.ts
import { Tile, TileType } from "./Tile";

export class Floor {
    width: number;
    height: number;
    z: number; // L'index Z (-1, 0, 1, 2...)
    grid: Tile[][];

    constructor(width: number, height: number, z: number) {
        this.width = width;
        this.height = height;
        this.z = z;

        this.grid = [];
        this.generateEmptyGrid();
    }

    // Génère la grille vide
    private generateEmptyGrid() {
        for (let y = 0; y < this.height; y++) {
            let row: Tile[] = [];
            for (let x = 0; x < this.width; x++) {
                // On passe z au Tile si besoin, sinon x, y suffisent
                let type: TileType;
                if (this.z == 0) {type = TileType.GRASS}
                else if (this.z > 0) {type = TileType.WATER}
                else {type = TileType.WALL}
                
                let tile = new Tile(type, x, y, this.z); 
                tile.isWalkable = true;
                row.push(tile);
            }
            this.grid.push(row);
        }
    }

    private generateTilesTypes() {
        // Ici, on pourrait ajouter des escaliers, des murs, etc. selon le Z
        // Par exemple, si z > 0, on pourrait ajouter des escaliers pour monter
        // Si z < 0, on pourrait ajouter des escaliers pour descendre
    }

    private generateUnits() {
        // Si on veut des unités fixes sur la map, on peut les générer ici
    }

    // --- Getters Utilitaires ---

    // Détermine le type dynamiquement selon Z
    get type(): 'GROUND' | 'UPPER' | 'UNDER' {
        if (this.z === 0) return 'GROUND';
        return this.z > 0 ? 'UPPER' : 'UNDER';
    }

    // Pour l'affichage (ex: "RDC", "1er Étage", "Sous-sol -1")
    get displayName(): string {
        if (this.z === 0) return "Rez-de-chaussée";
        if (this.z > 0) return `Étage ${this.z}`;
        return `Sous-sol ${Math.abs(this.z)}`;
    }
}