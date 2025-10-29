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

function collectFiles(folderPath: string): string[] {
    const files: string[] = [];

    function readFolder(folder: string) {
        const items = fs.readdirSync(folder);
        for (const item of items) {
            const itemPath = path.join(folder, item);
            const stats = fs.statSync(itemPath);
            if (stats.isDirectory()) {
                readFolder(itemPath);
            } else {
                files.push(itemPath);
            }
        }
    }

    readFolder(folderPath);
    return files;
}

function getAllGames(): string[] {
    const gamesDir = __dirname;
    const games = fs.readdirSync(gamesDir)
        .map(item => path.join(gamesDir, item))
        .filter(itemPath => fs.statSync(itemPath).isDirectory() && path.basename(itemPath).startsWith('game_'));
    return games;
}

async function splitFilesList(files: string[]) {
    for (const file of files) {
        const base = path.basename(file);
        if (/\.part\d+$/.test(base)) continue; // Skip already split files
        if (fs.statSync(file).size <= 19 * 1024 * 1024) continue; // Skip small files
        console.log(`Splitting file: ${file}`);
        await split(file);
    }
}

async function splitAllGamesOrSingle() {
    const arg = process.argv[2];

    if (arg) {
        // Resolve provided path: prefer absolute, then relative to script dir, then CWD
        let providedPath = arg;
        if (!path.isAbsolute(providedPath)) {
            const fromScript = path.join(__dirname, providedPath);
            const fromCwd = path.join(process.cwd(), providedPath);
            if (fs.existsSync(fromScript)) providedPath = fromScript;
            else if (fs.existsSync(fromCwd)) providedPath = fromCwd;
            else providedPath = providedPath; // keep as-is and let exists check fail below
        }

        if (!fs.existsSync(providedPath)) {
            throw new Error(`Path does not exist: ${arg}`);
        }

        const stats = fs.statSync(providedPath);
        if (stats.isDirectory()) {
            const files = collectFiles(providedPath);
            await splitFilesList(files);
            return;
        } else if (stats.isFile()) {
            await splitFilesList([providedPath]);
            return;
        } else {
            throw new Error(`Unsupported path type: ${arg}`);
        }
    } else {
        const games = getAllGames();
        for (const gameDir of games) {
            const files = collectFiles(gameDir);
            await splitFilesList(files);
        }
    }
}

splitAllGamesOrSingle().then(() => {
    console.log("All games processed.");
}).catch(err => {
    console.error("Error processing games:", err);
});