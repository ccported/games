// Usage: node inject.js <file-to-inject> (injects into all game_*/index.html)
const fs = require('fs');
const path = require('path');

const injectFile = process.argv[2];
if (!injectFile) {
  console.error('Usage: node inject.js <file-to-inject>');
  process.exit(1);
}
const injectContent = fs.readFileSync(injectFile, 'utf8');

const gameDirs = fs.readdirSync('.').filter(f => /^game_/.test(f) && fs.statSync(f).isDirectory());

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
console.log(`Injected into ${injectedCount} files.`);
