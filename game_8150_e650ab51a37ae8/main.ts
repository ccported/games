import { Circle, Pentagon, Shape, Square, Triangle } from "./Shapes";
const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

let gameStarted = false;
let currentShape: Shape | null = null;

let shapeMap = {
    "w": Triangle,
    "a": Square,
    "s": Circle,
    "d": Pentagon
};

let shapeClasses = [Triangle, Square, Circle, Pentagon];

let score = 0;
let timeLeft = 60;
let keyToPress = "";
let lastFrame = 0;
let frameCount = 0;
let fpsBuffer: Array<number> = [];
let gameOver = false;
let finalScore = 0;
let warmupActive = false;
let warmupIndex = 0;
const WARMUP_LETTERS = ["w", "a", "s", "d"];
let warmupLabel: string | null = null;
let warmupSequence: string[] = [];
let readyToPlayMusic = false;
let musicPlaying = false;
let bgAudio: HTMLAudioElement | null = null;

// Visual effects
let pulseScale = 1;
let pulseDirection = 1;
const pulseSpeed = 0.01;
const maxPulse = 1.05;
const minPulse = 1.0;

// +1 score popup effect
interface ScorePopup {
    x: number;
    y: number;
    opacity: number;
    yOffset: number;
    value: number;
}
let scorePopups: ScorePopup[] = [];

// Background falling shapes
type ShapeClass = typeof Triangle | typeof Square | typeof Circle | typeof Pentagon;
interface FallingShape {
    ShapeClass: ShapeClass;
    x: number;
    y: number;
    size: number;
    speed: number;
    rotation: number;
    rotationSpeed: number;
    opacity: number;
}
let fallingShapes: FallingShape[] = [];

function shuffleArray<T>(arr: T[]): T[] {
    const copy = arr.slice();
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = copy[i]!;
        copy[i] = copy[j]!;
        copy[j] = tmp;
    }
    return copy;
}

function addScorePopup(value: number = 1) {
    const anyShape: any = currentShape as any;
    scorePopups.push({
        x: anyShape.x + Math.random() * 30 - 15,
        y: anyShape.y - 50,
        opacity: 1,
        yOffset: 0,
        value: value
    });
}

function updateScorePopups(delta: number) {
    scorePopups = scorePopups.filter(popup => {
        popup.yOffset += 80 * delta;
        popup.opacity -= 1.5 * delta;
        return popup.opacity > 0;
    });
}

function drawScorePopups() {
    ctx.font = "bold 32px Arial";
    ctx.textAlign = "center";
    scorePopups.forEach(popup => {
        ctx.globalAlpha = popup.opacity;
        ctx.fillStyle = popup.value === 1 ? "#27ae60" : "#c0392b";
        ctx.strokeStyle = "white";
        ctx.lineWidth = 3;
        const y = popup.y - popup.yOffset;
        ctx.strokeText((popup.value === 1 ? "+" : "-") + "1", popup.x, y);
        ctx.fillText((popup.value === 1 ? "+" : "-") + "1", popup.x, y);
    });
    ctx.globalAlpha = 1;
    ctx.textAlign = "start";
}

function spawnFallingShape() {
    const ShapeClass = shapeClasses[Math.floor(Math.random() * shapeClasses.length)]!;
    fallingShapes.push({
        ShapeClass,
        x: Math.random() * canvas.width,
        y: -100,
        size: 30 + Math.random() * 40,
        speed: 50 + Math.random() * 100,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 2,
        opacity: 0.15 + Math.random() * 0.15
    });
}

function updateFallingShapes(delta: number) {
    // Spawn rate based on score
    const spawnChance = Math.min(score / 70, 1) * 0.2;
    if (Math.random() < spawnChance && fallingShapes.length < 500) {
        spawnFallingShape();
    }

    fallingShapes = fallingShapes.filter(shape => {
        shape.y += shape.speed * delta;
        shape.rotation += shape.rotationSpeed * delta;
        return shape.y < canvas.height + 100;
    });
}

function drawFallingShapes() {
    fallingShapes.forEach(shape => {
        ctx.save();
        ctx.globalAlpha = shape.opacity;
        ctx.translate(shape.x, shape.y);
        ctx.rotate(shape.rotation);
        
        const tempShape = new shape.ShapeClass(0, 0, shape.size);
        tempShape.draw(ctx);
        
        ctx.restore();
    });
    ctx.globalAlpha = 1;
}

function drawScore() {
    ctx.fillStyle = "black";
    ctx.font = "24px Arial";
    ctx.fillText(`Score: ${score}`, 20, 40);
}

function drawFPS() {
    ctx.fillStyle = "black";
    ctx.font = "16px Arial";
    const text = `FPS: ${fpsBuffer.length > 0 ? Math.round(fpsBuffer.reduce((a, b) => a + b, 0) / fpsBuffer.length) : 0}`;
    const padding = 20;
    const metrics = ctx.measureText(text);
    ctx.fillText(text, canvas.width - metrics.width - padding, 24);
}

function drawTime() {
    ctx.fillStyle = "black";
    ctx.font = "24px Arial";
    ctx.fillText(`Time: ${Math.ceil(Math.max(0, timeLeft))}`, 20, 70);
}

function clear() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function drawShape() {
    if (currentShape) {
        const anyShape: any = currentShape as any;
        
        ctx.save();
        ctx.translate(anyShape.x, anyShape.y);
        ctx.scale(pulseScale, pulseScale);
        ctx.translate(-anyShape.x, -anyShape.y);
        
        currentShape.draw(ctx);
        
        if (warmupActive && warmupLabel) {
            ctx.fillStyle = "white";
            ctx.font = "36px Arial";
            ctx.textAlign = "center";
            ctx.fillText(warmupLabel.toUpperCase(), anyShape.x, anyShape.y + 12);
            ctx.textAlign = "start";
        }
        
        ctx.restore();
    }
}

function updatePulse(delta: number) {
    pulseScale += pulseDirection * pulseSpeed * delta * 60;
    if (pulseScale >= maxPulse) {
        pulseScale = maxPulse;
        pulseDirection = -1;
    } else if (pulseScale <= minPulse) {
        pulseScale = minPulse;
        pulseDirection = 1;
    }
}

function drawStartScreen() {
    ctx.fillStyle = "black";
    ctx.font = "36px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Reaction Rush", canvas.width / 2, canvas.height / 2 - 80);
    ctx.font = "20px Arial";
    ctx.fillText("Press SPACE to start", canvas.width / 2, canvas.height / 2 - 40);
    ctx.textAlign = "left";
}

function spawnRandomShape() {
    const letters = Object.keys(shapeMap).filter(l => l.toLowerCase() !== (keyToPress || "").toLowerCase());
    const randomLetter = letters[Math.floor(Math.random() * letters.length)]! as keyof typeof shapeMap;
    keyToPress = randomLetter.toLowerCase();
    const ShapeClass = shapeMap[randomLetter];
    currentShape = new ShapeClass(canvas.width / 2, canvas.height / 2, 100);
}

function spawnWarmupShape() {
    warmupActive = true;
    if (warmupSequence.length > 0 && warmupIndex < warmupSequence.length) {
        warmupLabel = warmupSequence[warmupIndex]!;
    } else {
        warmupLabel = WARMUP_LETTERS[warmupIndex % WARMUP_LETTERS.length]!;
    }
    const ShapeClass = shapeMap[warmupLabel as keyof typeof shapeMap];
    currentShape = new ShapeClass(canvas.width / 2, canvas.height / 2, 100);
    keyToPress = warmupLabel as string;
}

function startGame() {
    gameStarted = true;
    score = 0;
    timeLeft = 60;
    gameOver = false;
    warmupActive = true;
    warmupIndex = 0;
    fallingShapes = [];
    scorePopups = [];
    warmupSequence = WARMUP_LETTERS.slice();
    const shuffled1 = shuffleArray(WARMUP_LETTERS.slice());
    const shuffled2 = shuffleArray(WARMUP_LETTERS.slice());
    warmupSequence = warmupSequence.concat(shuffled1, shuffled2);
    spawnWarmupShape();
    // try to start music on user gesture (SPACE key triggers startGame)
    playMusic();
}

function endGame() {
    gameStarted = false;
    currentShape = null;
    keyToPress = "";
    gameOver = true;
    finalScore = score;
    // stop music when game ends
    stopMusic();
}

function drawGameOver() {
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";
    ctx.font = "48px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Game Over", canvas.width / 2, canvas.height / 2 - 40);
    ctx.font = "28px Arial";
    ctx.fillText(`Final Score: ${finalScore}`, canvas.width / 2, canvas.height / 2 + 10);
    ctx.font = "18px Arial";
    ctx.fillText("Press SPACE to play again", canvas.width / 2, canvas.height / 2 + 50);
    ctx.textAlign = "start";
}

function main() {
    clear();
    
    let now = performance.now();
    let delta = (now - lastFrame) / 1000;
    lastFrame = now;
    
    fpsBuffer.push(1 / delta);
    if (fpsBuffer.length > 60) {
        fpsBuffer.shift();
    }
    
    if (gameStarted) {
        if (readyToPlayMusic && !musicPlaying) {
            playMusic();
        }
        updatePulse(delta);
        updateScorePopups(delta);
        updateFallingShapes(delta);
        
        drawFallingShapes();
        drawTime();
        drawScore();
        drawShape();
        drawScorePopups();
        
        timeLeft -= delta;
        if (timeLeft <= 0) {
            endGame();
        }
    } else {
        if (gameOver) {
            drawGameOver();
        } else {
            drawStartScreen();
        }
    }
    
    drawFPS();
    requestAnimationFrame(main);
}

window.addEventListener("keydown", (e) => {
    if (!gameStarted && e.code === "Space") {
        startGame();
    }

    if (gameStarted && currentShape) {
        if (warmupActive) {
            if (e.key.toLowerCase() === keyToPress) {
                score++;
                addScorePopup();
                warmupIndex++;
                if (warmupIndex >= warmupSequence.length) {
                    warmupActive = false;
                    warmupLabel = null;
                    spawnRandomShape();
                } else {
                    spawnWarmupShape();
                }
            }
        } else {
            if (e.key.toLowerCase() === keyToPress) {
                score++;
                addScorePopup();
                spawnRandomShape();
            } else {
                addScorePopup(-1);
                score = Math.max(0, score - 1);
            }
        }
    }
});

lastFrame = performance.now();
main();


function playMusic() {
    // reuse a single audio element so we can pause/stop it later
    try {
        if (!bgAudio) {
            bgAudio = new Audio('assets/music/background.mp3');
            bgAudio.loop = true;
            bgAudio.volume = 0.5;
        }
        // try to play; modern browsers return a promise which can reject if not allowed
        const playPromise = bgAudio.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                musicPlaying = true;
            }).catch(err => {
                // playback was prevented (autoplay policy); set ready flag and wait for user gesture
                musicPlaying = false;
                // keep bgAudio so we can try again on user interaction
                console.warn('Audio play was prevented:', err);
            });
        } else {
            musicPlaying = true;
        }
    } catch (err) {
        console.warn('playMusic error', err);
        musicPlaying = false;
    }
}

function stopMusic() {
    try {
        if (bgAudio) {
            bgAudio.pause();
            bgAudio.currentTime = 0;
        }
    } catch (err) {
        console.warn('stopMusic error', err);
    }
    musicPlaying = false;
}


canvas.addEventListener("focus", () => {
    readyToPlayMusic = true;
})