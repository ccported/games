class Block extends Body {
  constructor(code, x, y, r, sides) {
    super(Bodies.rectangle(x + blockSize / 2, y + blockSize / 2, blockSize, blockSize, { isStatic: true, chamfer: 5 }), "block");
    this.code = code;
    this.r = r;
    this.sides = sides;

    let s = blockSize / 2;
    this.distCriteria = b => b.x > this.body.position.x - s && b.y > this.body.position.y - s && b.x < this.body.position.x + s && b.y < this.body.position.y + s;
  }

  draw() {
    imageMode(CENTER);
    push();
    translate(this.body.position.x, this.body.position.y);
    rotate(this.r)
    image(sprites['block-' + this.code], 0, 0, 100, 100);
    pop();
    noStroke();
  }

  strike(b) {
    if (b.stats.fromId === player.id) {
      playSound("bullet-impact.mp3", 0.05, true)
    }
    b.kill();
  }

  run() { }
}