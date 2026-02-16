import * as fs from 'fs';
import * as path from 'path';

function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
    const files = fs.readdirSync(dirPath);
    files.forEach(file => {
        const filePath = path.join(dirPath, file);
        if (fs.statSync(filePath).isDirectory()) {
            getAllFiles(filePath, arrayOfFiles);
        } else {
            console.log("[DISCOVERED FILE]", filePath);
            arrayOfFiles.push(filePath);
        }
    });
    return arrayOfFiles;
}

function calculateAverageFileSize(dirPath: string): number {
    const allFiles = getAllFiles(dirPath);
    const totalSize = allFiles.reduce((acc, filePath) => {
        const stats = fs.statSync(filePath);
        console.log(`[FILE SIZE] ${filePath}: ${stats.size} bytes`);
        return acc + stats.size;
    }, 0);
    return allFiles.length === 0 ? 0 : totalSize / allFiles.length;
}

function main() {
    const targetDir = __dirname;
    const dirs = fs.readdirSync(targetDir).filter(name => {
        const fullPath = path.join(targetDir, name);
        return fs.statSync(fullPath).isDirectory() && name.startsWith('game_');
    });

    const results: { [key: string]: number } = {};
    dirs.forEach(dir => {
        const fullPath = path.join(targetDir, dir);
        const avgSize = calculateAverageFileSize(fullPath);
        results[dir] = avgSize;
    });

    const resultsSorted = Object.fromEntries(
        Object.entries(results).sort(([, a], [, b]) => b - a)
    );

    const avgTotal = Object.values(results).reduce((acc, size) => acc + size, 0) / Object.values(results).length;
    console.log(`Overall Average File Size: ${(avgTotal / Math.pow(1024,2)).toFixed(2)} mb`);
}

main();