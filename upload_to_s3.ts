import { exec, execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";












function getGameNames() {
    const gamesDir = path.join(__dirname);

    return fs.readdirSync(gamesDir).filter((file) => {
        return fs.statSync(path.join(gamesDir, file)).isDirectory() && !file.startsWith('.') && file.startsWith("game_");
    });
}


function getNoWork() {
    return fs.readFileSync(path.join(__dirname, 'no_work.txt'), 'utf-8').split('\n').map(line => line.trim()).filter(line => line.length > 0);
}

function main() {
    const gameNames = getGameNames();
    console.log(`Found ${gameNames.length} games.`);
    const noWork = getNoWork();
    for(const gameName of gameNames) {
        if (noWork.includes(gameName)) {
            console.log(`Skipping ${gameName} as it's in no_work.txt`);
            continue;
        }
        const gameDir = path.join(__dirname, gameName);
        console.log(`Processing ${gameName}...`);

        const command = `aws s3 cp "${gameDir}/" "s3://ccportedgames/${gameName}/" --recursive`;

        execSync(command, { stdio: 'inherit' });
    }
}


main();