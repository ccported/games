import * as fs from "fs";
import path from "path";
import { promisify } from "util";

const stat = promisify(fs.stat);
const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);

// Part size in mb (19mb default to avoid Cloudflare 20mb limit)
async function split(filename: string, partSize: number = 19): Promise<void> {
    const fileStats = await stat(filename);
    const totalSize = fileStats.size;
    const partCount = Math.ceil(totalSize / (partSize * 1024 * 1024));

    await mkdir(path.dirname(filename), { recursive: true });

    for (let i = 0; i < partCount; i++) {
        const start = i * partSize * 1024 * 1024;
        const end = Math.min(start + partSize * 1024 * 1024, totalSize);
        const partData = await new Promise<Buffer>((resolve, reject) => {
            const chunks: Buffer[] = [];
            const stream = fs.createReadStream(filename, { start, end: end - 1 });
            stream.on("data", chunk => chunks.push(chunk as Buffer));
            stream.on("end", () => resolve(Buffer.concat(chunks)));
            stream.on("error", reject);
        });
        await writeFile(`${filename}.part${i + 1}`, partData);
    }
}






function handleGame(gameID: string): string[] {
    const gamePath = path.join(__dirname, gameID);
    const files: string[] = [];
    
    function readFolder(folderPath: string) {
        const items = fs.readdirSync(folderPath);
        for (const item of items) {
            const itemPath = path.join(folderPath, item);
            const stats = fs.statSync(itemPath);
            if (stats.isDirectory()) {
                readFolder(itemPath);
            } else {
                files.push(itemPath);
            }
        }
    }

    readFolder(gamePath);
    return files;
}


function getAllGames() {
    const gamesDir = __dirname;
    const games = fs.readdirSync(gamesDir).filter(item => {
        const itemPath = path.join(gamesDir, item);
        return fs.statSync(itemPath).isDirectory() && item.startsWith('game_');
    });
    return games;
}



async function splitAllGames() {
    const games = getAllGames();
    for (const game of games) {
        const files = handleGame(game);
        for (const file of files) {
            if (file.split('.').pop()?.startsWith('part')) continue; // Skip already split files
            if (fs.statSync(file).size <= 19 * 1024 * 1024) continue; // Skip small files
            console.log(`Splitting file: ${file}`);
            await split(file);
        }
    }
}



splitAllGames().then(() => {
    console.log("All games processed.");
}).catch(err => {
    console.error("Error processing games:", err);
});