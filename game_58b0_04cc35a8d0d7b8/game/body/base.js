class Base extends Body {
  constructor(x, y) {
    super(
      Bodies.circle(x, y, blockSize * 0.75, {
        isStatic: true,
      }),
      "base"
    );
    this.health = 2500;
    this.maxHealth = 2500;
    this.regen = 0.005;
    this.hbtime = 255;
    this.team = "b"
    this.id = "BLUEBASE"

    this.distCriteria = b => dist(b.x, b.y, this.body.position.x, this.body.position.y) <= blockSize * 0.75 && b.stats.team === 'r';
  }

  kill() {
    World.remove(world, this.body);
    if (onScreen(this.body.position.x, this.body.position.y)) {
      playSound("explosion.mp3", 0.075, true)
      playSound("explosion2.mp3", 0.075, true)
      for (let u = 5; u--;) particles.push(new Particle("explosion", this.body.position.x + random(-30, 30), this.body.position.y + random(-30, 30)))
      shakeX = 10;
      shakeY = 10;
    }
    this.dead = true;
  }

  strike(b) {
    this.health -= b.stats.damage;
    this.hbtime = 255;
    if (this.health <= 0) this.kill();
    b.kill();
  }

  draw() {
    push();
    translate(this.body.position.x, this.body.position.y);
    rotate(frameCount / 100)
    image(sprites.base, 0, 0, blockSize * 2, blockSize * 2);
    rotate(-frameCount / 100)
    stroke(colors.blueHighest + opac(this.hbtime));
    strokeWeight(1);
    noFill();
    quad(-blockSize + 5, -blockSize, -blockSize - 5, -blockSize + 20, -blockSize - 5 + (blockSize * 2), -blockSize + 20, -blockSize + 5 + (blockSize * 2), -blockSize);
    fill(colors.blueHigher + opac(this.hbtime));
    noStroke();
    quad(-blockSize + 5, -blockSize, -blockSize - 5, -blockSize + 20, -blockSize - 5 + (blockSize * 2 * (this.health / this.maxHealth)), -blockSize + 20, -blockSize + 5 + (blockSize * 2 * (this.health / this.maxHealth)), -blockSize)
    pop();
  }

  run() {
    if (this.health < this.maxHealth) this.health += this.regen;
    if (this.hbtime > 0) {
      this.hbtime -= 5;
    }

    if (this.health <= 0) {
      this.kill();
    }
  }
}