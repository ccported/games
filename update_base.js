const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get current commit hash
function getLatestCommitHash() {
    try {
        return execSync('git ls-remote origin HEAD').toString().split("\t")[0].trim();
    } catch (e) {
        console.error('Could not get git commit hash.');
        process.exit(1);
    }
}

const commitHash = getLatestCommitHash();


// Get gameID from argv if provided
const gameID = process.argv[2];

let gameDirs;
if (gameID) {
    const dir = `${gameID}`;
    if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
        gameDirs = [dir];
    } else {
        console.error(`Directory ${dir} does not exist.`);
        process.exit(1);
    }
} else {
    gameDirs = fs.readdirSync('.').filter(f => /^game_/.test(f) && fs.statSync(f).isDirectory());
}

if (gameDirs.length > 2) {
    const baseExistsFile = 'base_exists.txt';
    fs.writeFileSync(baseExistsFile, ''); // Clear file
    // Full search so this is ok
}

gameDirs.forEach(dir => {
    const indexPath = path.join(dir, 'index.html');
    if (!fs.existsSync(indexPath)) return;
    let html = fs.readFileSync(indexPath, 'utf8');
    const baseTagRegex = /<base\b[^>]*>/i;
    if (baseTagRegex.test(html)) {
        // Track files with existing <base>
        fs.appendFileSync(baseExistsFile, indexPath + '\n');
        return;
    }
    // Insert <base> after <head>
    const jsdelivrUrl = `https://cdn.jsdelivr.net/gh/ccported/games@${commitHash}/${dir}/`;
    const baseTag = `<base href="${jsdelivrUrl}">`;
    html = html.replace(/<head(\s*[^>]*)>/i, match => match + '\n    ' + baseTag);
    fs.writeFileSync(indexPath, html, 'utf8');
    console.log(`Updated <base> in ${indexPath}`);
});

console.log('Done.');
