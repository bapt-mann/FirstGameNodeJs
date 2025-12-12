export class Player {

  public id: string;
  public pseudo: string;
  public count: number;

  constructor(id:string, pseudo:string) {
    this.id = id;
    this.pseudo = pseudo;
    this.count = 0;
  }

  public increment() {
    this.count++;
  }
}
