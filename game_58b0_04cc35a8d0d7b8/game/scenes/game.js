let camX = 0;
let camY = 0;
let shakeX = 0;
let shakeY = 0;
let failTimer = 100;
let succeedTimer = 100;
let onScreen = (X, Y) => {
  let { x, y } = player.body.position;
  return (X > x - width  *  0.75 && X < x + width  *  0.75 && Y > y - height  *  0.75 && Y < y + height  *  0.75)
}
let fr = 0;

const game = () => {
  bullets = bullets.filter(x => !x.dead).filter(u => u.x >= 0 && u.x < mapWidth && u.y >= 0 && u.y < mapHeight);
  bodies = bodies.filter(x => !!x.body && !x.dead).filter(u => u.body.position.x >= 0 && u.body.position.x < mapWidth && u.body.position.y >= 0 && u.body.position.y < mapHeight);
  particles = particles.filter(x => !x.dead).filter(u => u.x >= 0 && u.x < mapWidth && u.y >= 0 && u.y < mapHeight);
  camX += (-player.body.position.x - camX)  /  5;
  camY += (-player.body.position.y - camY)  /  5;

  shakeX += -shakeX  /  10
  shakeY += -shakeY  /  10

  background(0);
  push();
  translate(camX + width  /  2, camY + height  /  2);
  translate(random(-shakeX, shakeX), random(-shakeY, shakeY));
  image(bg, 0, 0, mapWidth, mapHeight);

  for(let p = particles.length; p--;){
    let particle = particles[p];
    if(onScreen(particle.x, particle.y)){
      particle.draw()
    }
    particle.run();
  }
  
  for(let j = bullets.length; j--;){
    let bullet = bullets[j];
    if  (onScreen(bullet.x, bullet.y)) bullet.draw();
    bullet.run();
  }
  
  for(let i = bodies.length; i--;){
    let body = bodies[i];
    if (!body.invis) body.draw();
    body.run();
    for(let j = bullets.length; j--;){
      let b = bullets[j];
      if(body.distCriteria) {
        if(body.distCriteria(b)) {
          body.strike(b);
        }
      }
    }
  }
  
  
  pop();

  textSize(15);
  textAlign(LEFT, TOP);
  text(fr, 0, 0);
  if(frameCount % 25 === 0){
    fr = Math.round(frameRate())
  }

  runGameUI();
    
  if(player.dead || levels[level].fail()){
    failTimer--;
  }  
  if(levels[level].succeed()) {
    succeedTimer--;
  }  
  if(failTimer <= 0) {
    scene = "fail";
  }  
  if(succeedTimer <= 0) {
    scene = "succeed";
  }
}