// Usage: node undo_inject.js <file-to-remove> (removes from all game_*/index.html)
const fs = require('fs');
const path = require('path');

const removeFile = process.argv[2];
const newFile = process.argv[3];
if (!removeFile || !newFile) {
    console.error('Usage: node undo_inject.js <old-injection-file> <new-injection-file>');
    process.exit(1);
}
const removeContent = fs.readFileSync(removeFile, 'utf8').trim();
const newContent = fs.readFileSync(newFile, 'utf8').trim();
const gameDirs = fs.readdirSync('.').filter(f => /^game_/.test(f) && fs.statSync(f).isDirectory());

let removedCount = 0;
gameDirs.forEach(dir => {
    const indexPath = path.join(dir, 'index.html');
    if (!fs.existsSync(indexPath)) return;
    let html = fs.readFileSync(indexPath, 'utf8');
    // Remove the injected script content (not inside <script> tags)
    const regex = new RegExp(removeContent.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    const newHtml = html.replace(regex, newContent);
    if (newHtml !== html) {
        fs.writeFileSync(indexPath, newHtml, 'utf8');
        removedCount++;
    }

});
console.log(`Removed injected content from ${removedCount} files.`);

fs.writeFileSync(removeFile, newContent, 'utf8');
