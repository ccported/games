// Usage: node rewrite_paths.js [gameID]
// Rewrites all relative href/src in game_*/index.html to use the latest CDN base
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function getLatestCommitHash() {
  try {
    return execSync('git ls-remote origin HEAD').toString().split("\t")[0].trim();
  } catch (e) {
    console.error('Could not get git commit hash.');
    process.exit(1);
  }
}

const commitHash = getLatestCommitHash();
const repoBase = `https://cdn.jsdelivr.net/gh/ccported/games@${commitHash}`;

const gameID = process.argv[2];
let gameDirs;

if (gameID) {
  const dir = `${gameID}`;
  if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
    gameDirs = [dir];
  } else {
    console.error(`Directory ${dir} not found.`);
    process.exit(1);
  }
} else {
  gameDirs = fs.readdirSync('.').filter(f => /^game_/.test(f) && fs.statSync(f).isDirectory());
}

let updatedCount = 0;
gameDirs.forEach(dir => {
  const indexPath = path.join(dir, 'index.html');
  if (!fs.existsSync(indexPath)) return;
  let html = fs.readFileSync(indexPath, 'utf8');
  // Replace ALL relative href/src (not starting with http, https, //, or /) using global regex
  // Match href/src with values not starting with protocol, //, or #, or starting with /
  const regex = /(href|src)\s*=\s*(["'])\/([^"'#?]+)\2/gi;
  html = html.replace(regex, (match, attr, quote, relPath) => {
    const newUrl = `${repoBase}/${relPath}`;
    return `${attr}=${quote}${newUrl}${quote}`;
  });
  fs.writeFileSync(indexPath, html, 'utf8');
  updatedCount++;
});
console.log(`Rewrote href/src in ${updatedCount} file${updatedCount === 1 ? '' : 's'}.`);
