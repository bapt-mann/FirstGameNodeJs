import { Capacity } from "./Capacity";

export class Character {
    public name: string;
    public health: number;
    public travelRange: number;
    public capacities: Capacity[];

    constructor(name: string, health: number, travelRange: number, capacities:Capacity[]) {
        this.name = name;
        this.health = health;
        this.travelRange = travelRange;
        this.capacities = capacities;
    }
}