// Usage: node update_base_hash.js
// Updates the hash in <base> tags for ccported/games in all game_*/index.html
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
const repoPattern = /ccported\/games@([a-f0-9]{40})/i;

const gameDirs = fs.readdirSync('.').filter(f => /^game_/.test(f) && fs.statSync(f).isDirectory());

let updatedCount = 0;
gameDirs.forEach(dir => {
  const indexPath = path.join(dir, 'index.html');
  if (!fs.existsSync(indexPath)) return;
  let html = fs.readFileSync(indexPath, 'utf8');
  // Find <base> tag with ccported/games@HASH
  html = html.replace(/(<base\s+href=["'])([^"']*ccported\/games@)[a-f0-9]{40}([^"']*["'][^>]*>)/i,
    (match, p1, p2, p3) => `${p1}${p2}${commitHash}${p3}`
  );
  fs.writeFileSync(indexPath, html, 'utf8');
  updatedCount++;
});
console.log(`Updated <base> hash in ${updatedCount} files.`);
