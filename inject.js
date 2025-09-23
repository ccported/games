// Usage: node inject.js <file-to-inject> [gameID or path]
// If gameID/path is provided, only inject into that game's index.html

const fs = require('fs');
const path = require('path');

const injectFile = process.argv[2];
const targetGame = process.argv[3];

if (!injectFile) {
    console.error('Usage: node inject.js <file-to-inject> [gameID or path]');
    process.exit(1);
}
const injectContent = fs.readFileSync(injectFile, 'utf8');

let gameDirs = [];

if (targetGame) {
    let dir = targetGame;
    if (!fs.existsSync(dir)) {
        dir = `${targetGame}`;
    }
    if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
        gameDirs = [dir];
    } else {
        console.error(`Game directory not found: ${dir}`);
        process.exit(1);
    }
} else {
    gameDirs = fs.readdirSync('.').filter(f => /^game_/.test(f) && fs.statSync(f).isDirectory());
}

let injectedCount = 0;
gameDirs.forEach(dir => {
    const indexPath = path.join(dir, 'index.html');
    if (!fs.existsSync(indexPath)) return;
    let html = fs.readFileSync(indexPath, 'utf8');
    // Inject just after <head>
    html = html.replace(/<head(\s*[^>]*)>/i, match => match + '\n' + injectContent);
    fs.writeFileSync(indexPath, html, 'utf8');
    injectedCount++;
});
console.log(`Injected into ${injectedCount} file${injectedCount === 1 ? '' : 's'}.`);
