export class Capacity {
    
    public name: string;
    public description: string;
    public range: number;
    public damage: number;

    constructor(name: string, description: string, range: number, damage: number) {
        this.name = name;
        this.description = description;
        this.range = range;
        this.damage = damage;
    }
}