export enum TileType {
  GRASS = 'GRASS',
  WALL = 'WALL',
  WATER = 'WATER',
  STAIRS_UP = 'STAIRS_UP',
  STAIRS_DOWN = 'STAIRS_DOWN'
}

export class Tile {
  type: TileType;
  isWalkable: boolean;
  x: number;
  y: number;
  floorZ: number; 

  constructor(type: TileType, x: number, y: number, floorZ: number) {
    this.type = type;
    this.isWalkable = true; // Par défaut, on considère que toutes les cases sont marchables. On ajustera selon le type.
    this.x = x;
    this.y = y;
    this.floorZ = floorZ;
  }
}