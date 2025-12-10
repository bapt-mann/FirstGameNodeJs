export default class Player {
  constructor(id, pseudo) {
    this.id = id;
    this.pseudo = pseudo;
    this.count = 0;
  }

  increment() {
    this.count++;
  }
}

