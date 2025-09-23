import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";
import { spawn } from "child_process";

// Standard text and small image file extensions that don't need LFS
const STANDARD_TEXT_EXTENSIONS = new Set([
    '.txt', '.md', '.json', '.xml', '.yml', '.yaml', '.csv', '.log', 
    '.ini', '.cfg', '.conf', '.gitignore', '.gitattributes'
]);

const STANDARD_CODE_EXTENSIONS = new Set([
    '.js', '.ts', '.html', '.css', '.scss', '.sass', '.less',
    '.py', '.java', '.c', '.cpp', '.h', '.hpp', '.cs', '.php',
    '.rb', '.go', '.rs', '.swift', '.kt', '.dart', '.vue', '.jsx', '.tsx'
]);

const STANDARD_SMALL_IMAGE_EXTENSIONS = new Set([
    '.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.ico'
]);

// File size limit for LFS (100 MB)
const LFS_SIZE_LIMIT = 100 * 1024 * 1024;

/**
 * Recursively reads all directories in a directory and returns their paths and total sizes.
 * Only directories are included in the result.
 * 
 * @param dirPath directory path
 * @returns An object with totalSize and an array of directory info { path, size }
 */
async function readDirectory(dirPath: string): Promise<{ totalSize: number, files: { path: string, size: number }[] }> {
    async function getDirSize(currentPath: string): Promise<number> {
        const entries = await fs.promises.readdir(currentPath, { withFileTypes: true });
        let size = 0;
        for (const entry of entries) {
            const entryPath = path.join(currentPath, entry.name);
            if (entry.isFile()) {
                const stats = await fs.promises.stat(entryPath);
                size += stats.size;
            } else if (entry.isDirectory()) {
                size += await getDirSize(entryPath);
            }
        }
        return size;
    }

    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    const dirs: { path: string, size: number }[] = [];
    let totalSize = 0;

    let hasSubdirs = false;
    for (const entry of entries) {
        if (entry.isDirectory()) {
            hasSubdirs = true;
            const entryPath = path.join(dirPath, entry.name);
            const dirSize = await getDirSize(entryPath);
            dirs.push({ path: entryPath, size: dirSize });
            totalSize += dirSize;
        }
    }

    // If no subdirectories, include the root directory itself if it contains files
    if (!hasSubdirs) {
        const rootSize = await getDirSize(dirPath);
        dirs.push({ path: dirPath, size: rootSize });
        totalSize = rootSize;
    }

    return { totalSize, files: dirs };
}

/**
 * Gets all individual files in a directory with their sizes for splitting purposes.
 * 
 * @param dirPath directory path
 * @returns Array of file info { path, size, relativePath }
 */
async function getFileList(dirPath: string): Promise<{ path: string, size: number, relativePath: string }[]> {
    const files: { path: string, size: number, relativePath: string }[] = [];
    
    async function scanDirectory(currentPath: string, baseDir: string) {
        const entries = await fs.promises.readdir(currentPath, { withFileTypes: true });
        
        for (const entry of entries) {
            const entryPath = path.join(currentPath, entry.name);
            const relativePath = path.relative(baseDir, entryPath);
            
            if (entry.isFile()) {
                const stats = await fs.promises.stat(entryPath);
                files.push({ 
                    path: entryPath, 
                    size: stats.size, 
                    relativePath: relativePath 
                });
            } else if (entry.isDirectory()) {
                await scanDirectory(entryPath, baseDir);
            }
        }
    }
    
    await scanDirectory(dirPath, dirPath);
    return files;
}

/**
 * Determines if a file should use Git LFS based on its size only.
 * 
 * @param filePath Path to the file
 * @param fileSize Size of the file in bytes
 * @returns True if file should use LFS, false otherwise
 */
function shouldUseLFS(filePath: string, fileSize: number): boolean {
    // Only use LFS for files over 15MB
    return fileSize > LFS_SIZE_LIMIT;
}

/**
 * Separates files into LFS and regular files for proper handling.
 * 
 * @param files Array of file info
 * @returns Object with lfsFiles and regularFiles arrays
 */
function separateFilesByType(files: { path: string, size: number, relativePath: string }[]): {
    lfsFiles: { path: string, size: number, relativePath: string }[],
    regularFiles: { path: string, size: number, relativePath: string }[]
} {
    const lfsFiles: { path: string, size: number, relativePath: string }[] = [];
    const regularFiles: { path: string, size: number, relativePath: string }[] = [];
    
    for (const file of files) {
        if (shouldUseLFS(file.path, file.size)) {
            lfsFiles.push(file);
        } else {
            regularFiles.push(file);
        }
    }
    
    return { lfsFiles, regularFiles };
}

/**
 * Groups files into chunks that stay under the size limit.
 * 
 * @param files Array of file info
 * @param maxChunkSize Maximum size per chunk in bytes
 * @returns Array of chunks, each containing file paths
 */
function createFileChunks(files: { path: string, size: number, relativePath: string }[], maxChunkSize: number): string[][] {
    // Sort files by size (largest first) to better pack chunks
    const sortedFiles = [...files].sort((a, b) => b.size - a.size);
    const chunks: string[][] = [];
    
    for (const file of sortedFiles) {
        // If a single file is larger than maxChunkSize, it gets its own chunk
        if (file.size > maxChunkSize) {
            console.log(`Warning: File ${file.relativePath} (${file.size} bytes) exceeds chunk size limit`);
            chunks.push([file.relativePath]);
            continue;
        }
        
        // Try to find an existing chunk that can fit this file
        let placed = false;
        for (let i = 0; i < chunks.length; i++) {
            const currentChunkSize = chunks[i].reduce((sum, filePath) => {
                const fileInfo = files.find(f => f.relativePath === filePath);
                return sum + (fileInfo?.size || 0);
            }, 0);
            
            if (currentChunkSize + file.size <= maxChunkSize) {
                chunks[i].push(file.relativePath);
                placed = true;
                break;
            }
        }
        
        // If no existing chunk can fit this file, create a new one
        if (!placed) {
            chunks.push([file.relativePath]);
        }
    }
    
    return chunks;
}

async function handleGame(gamePath: string) {

    if (gamePath.includes('node_modules') || path.basename(gamePath).startsWith('.')) {
        console.log(`Skipping: ${gamePath}`);
        return;
    }
    if (!fs.statSync(gamePath).isDirectory()) {
        console.log(`Skipping non-directory: ${gamePath}`);
        return;
    }

    const gameName = path.basename(gamePath);
    console.log(`Handling game: ${gameName}`);
    const { totalSize, files } = await readDirectory(gamePath);
    console.log(`Total size of ${gameName}: ${totalSize} bytes`);
    
    // Set size limits
    const gb1 = 1024 * 1024 * 1024; // 1 GB
    const maxChunkSize = 500 * 1024 * 1024; // 500 MB per chunk (conservative limit to avoid push issues)

    let flag: "split" | "single" = (totalSize > gb1) ? "split" : "single";
    console.log(`Game ${gameName} is classified as: ${flag}`);

    // Get all files in the game directory
    const fileList = await getFileList(gamePath);
    console.log(`Found ${fileList.length} files to process`);
    
    // Separate files by type (LFS vs regular)
    const { lfsFiles, regularFiles } = separateFilesByType(fileList);
    console.log(`  LFS files: ${lfsFiles.length}, Regular files: ${regularFiles.length}`);
    
    // Set up LFS tracking for binary/large files
    if (lfsFiles.length > 0) {
        await setupLFSTrackingFast(lfsFiles, gameName);
    }
    
    // Further processing can be done here based on the flag
    if (flag === "split") {
        console.log(`Game ${gameName} will be split into smaller parts.`);
        
        // Create chunks that respect size limits (but consider LFS files differently)
        // LFS files don't count toward push size limits as much, so we can be more lenient
        const adjustedFileList = fileList.map(file => ({
            ...file,
            // LFS files have reduced effective size for chunking purposes
            effectiveSize: shouldUseLFS(file.path, file.size) ? Math.min(file.size, maxChunkSize / 10) : file.size
        }));
        
        const chunks = createFileChunks(adjustedFileList.map(f => ({ ...f, size: f.effectiveSize })), maxChunkSize);
        console.log(`Split into ${chunks.length} chunks`);
        
        // Log chunk sizes for debugging
        for (let i = 0; i < chunks.length; i++) {
            const chunkActualSize = chunks[i].reduce((sum, filePath) => {
                const fileInfo = fileList.find(f => f.relativePath === filePath);
                return sum + (fileInfo?.size || 0);
            }, 0);
            const chunkLFSFiles = chunks[i].filter(filePath => {
                const fileInfo = fileList.find(f => f.relativePath === filePath);
                return fileInfo && shouldUseLFS(fileInfo.path, fileInfo.size);
            }).length;
            console.log(`  Chunk ${i + 1}: ${chunks[i].length} files, ${(chunkActualSize / (1024 * 1024)).toFixed(2)} MB (${chunkLFSFiles} LFS files)`);
        }
        
        // Commit each chunk separately
        await executeChunkedGitCommands(gamePath, gameName, chunks);
    } else {
        // Upload to monorepo on github using git commands (upload to ccported/games) (already initialized on base path)
        // Need to run git commands from the root repository, not inside the game directory
        const gameRelativePath = path.relative('./', gamePath);
        await executeGitCommands(gameRelativePath, gameName);
    }
}

async function execute(command: string) {
    console.log(`Executing: ${command}`);
    await new Promise<void>((resolve, reject) => {
        const child = spawn('powershell', ['-Command', command], { stdio: 'inherit' });

        child.on('error', (err) => {
            console.error(`Failed to start command: ${err}`);
            reject(err);
        });

        child.on('close', (code) => {
            if (code !== 0) {
                console.error(`Command exited with code ${code}`);
                reject(new Error(`Command failed: ${command}`));
            } else {
                resolve();
            }
        });
    });
}

async function executeGitCommands(gameRelativePath: string, gameName: string) {
    try {
        // Add the specific game directory to git
        console.log(`Adding ${gameRelativePath} to git...`);
        await execute(`git add "${gameRelativePath}"`);
        
        // Check if there are actually any changes to commit
        console.log(`Checking for changes to commit for ${gameName}...`);
        try {
            await execute('git diff --cached --quiet');
            // If the command succeeds, there are no staged changes
            console.log(`No changes detected for ${gameName}, skipping commit.`);
            return;
        } catch (error) {
            // If the command fails, there are staged changes to commit
            console.log(`Changes detected for ${gameName}, proceeding with commit.`);
        }
        
        // Commit the changes
        console.log(`Committing ${gameName}...`);
        await execute(`git commit -m "Add ${gameName}"`);
        
        // Push to remote
        console.log(`Pushing ${gameName} to remote...`);
        await execute(`git push origin main`);
        
        console.log(`Successfully committed and pushed ${gameName}`);
    } catch (error) {
        console.error(`Failed to process ${gameName}:`, error);
        throw error;
    }
}

/**
 * Fast Git LFS setup by directly modifying .gitattributes file.
 * Only tracks specific large files (>15MB), not file types.
 * 
 * @param lfsFiles Array of LFS files to track
 * @param gameName Name of the game directory for proper path construction
 */
async function setupLFSTrackingFast(lfsFiles: { path: string, size: number, relativePath: string }[], gameName: string): Promise<void> {
    if (lfsFiles.length === 0) return;
    
    console.log(`Setting up Git LFS tracking for ${lfsFiles.length} large files (>15MB)...`);
    
    // Read existing .gitattributes or create new content
    const gitattributesPath = '.gitattributes';
    let existingContent = '';
    try {
        existingContent = await fs.promises.readFile(gitattributesPath, 'utf8');
    } catch (error) {
        // File doesn't exist, that's fine
        console.log('Creating new .gitattributes file');
    }
    
    // Parse existing LFS patterns to avoid duplicates
    const existingPatterns = new Set<string>();
    const lines = existingContent.split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.includes('filter=lfs') && trimmed.includes('diff=lfs') && trimmed.includes('merge=lfs')) {
            const pattern = trimmed.split(/\s+/)[0];
            if (pattern) {
                existingPatterns.add(pattern);
            }
        }
    }
    
    // Build new LFS patterns to add (specific files only)
    const newPatterns: string[] = [];
    
    for (const file of lfsFiles) {
        // Construct full path from repository root: gameName/relativePath
        const fullRepoPath = `${gameName}/${file.relativePath}`.replace(/\\/g, '/');
        if (!existingPatterns.has(fullRepoPath)) {
            newPatterns.push(`${fullRepoPath} filter=lfs diff=lfs merge=lfs -text`);
            console.log(`  Will track large file: ${fullRepoPath} (${(file.size / (1024 * 1024)).toFixed(2)}MB)`);
        } else {
            console.log(`  Large file already tracked: ${fullRepoPath}`);
        }
    }
    
    // Write updated .gitattributes if we have new patterns
    if (newPatterns.length > 0) {
        const newContent = existingContent + (existingContent && !existingContent.endsWith('\n') ? '\n' : '') + 
                          newPatterns.join('\n') + '\n';
        
        await fs.promises.writeFile(gitattributesPath, newContent, 'utf8');
        console.log(`Added ${newPatterns.length} new LFS patterns to .gitattributes`);
        
        // Stage the .gitattributes file
        try {
            await execute('git add .gitattributes');
        } catch (error) {
            console.warn('Could not stage .gitattributes:', error);
        }
    } else {
        console.log('All large files already tracked in .gitattributes');
    }
}

/**
 * Commits files in chunks to avoid exceeding Git push size limits.
 * 
 * @param gamePath Full path to the game directory
 * @param gameName Name of the game
 * @param chunks Array of file chunks (each chunk is an array of relative file paths)
 */
async function executeChunkedGitCommands(gamePath: string, gameName: string, chunks: string[][]) {
    const gameRelativePath = path.relative('./', gamePath);
    
    console.log(`Processing ${gameName} in ${chunks.length} chunks...`);
    
    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const chunkNumber = i + 1;
        const totalChunks = chunks.length;
        
        console.log(`\nProcessing chunk ${chunkNumber}/${totalChunks} (${chunk.length} files)...`);
        
        try {
            // Add each file in the chunk individually
            for (const relativeFilePath of chunk) {
                const fullFilePath = path.join(gameRelativePath, relativeFilePath);
                console.log(`  Adding: ${fullFilePath}`);
                await execute(`git add "${fullFilePath}"`);
            }
            
            // Check if there are actually any changes to commit
            console.log(`Checking for changes in chunk ${chunkNumber}/${totalChunks}...`);
            try {
                await execute('git diff --cached --quiet');
                // If the command succeeds, there are no staged changes
                console.log(`No changes detected in chunk ${chunkNumber}/${totalChunks}, skipping.`);
                continue;
            } catch (error) {
                // If the command fails, there are staged changes to commit
                console.log(`Changes detected in chunk ${chunkNumber}/${totalChunks}, proceeding.`);
            }
            
            // Commit this chunk
            const commitMessage = totalChunks > 1 
                ? `Add ${gameName} (part ${chunkNumber}/${totalChunks})`
                : `Add ${gameName}`;
            
            console.log(`Committing chunk ${chunkNumber}/${totalChunks}...`);
            await execute(`git commit -m "${commitMessage}"`);
            
            // Push this chunk
            console.log(`Pushing chunk ${chunkNumber}/${totalChunks} to remote...`);
            await execute(`git push origin main`);
            
            console.log(`✓ Successfully processed chunk ${chunkNumber}/${totalChunks}`);
            
        } catch (error) {
            console.error(`Failed to process chunk ${chunkNumber}/${totalChunks} for ${gameName}:`, error);
            throw error;
        }
    }
    
    console.log(`\n✓ Successfully committed and pushed all chunks for ${gameName}`);
}


function promiseifyExec(cmd: string): Promise<{ stdout: string, stderr: string }> {
    return new Promise((resolve, reject) => {
        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                reject(`Error executing command: ${error.message}`);
                return;
            }
            resolve({ stdout, stderr });
        });
    });
}

async function main() {
    const dirPath = './';
    const allGames = await readDirectory(dirPath);
    console.log(allGames)
    
    // Test with a single game first
    // await handleGame("C:\\Users\\matfu\\Documents\\s3\\ccportedgames\\game_993d_9e260f37d342c");
    
    // Process games sequentially to avoid git conflicts
    for (const fileInfo of allGames.files) {
        // Skip node_modules and hidden directories
        if (fileInfo.path.includes('node_modules') || path.basename(fileInfo.path).startsWith('.')) {
            console.log(`Skipping: ${fileInfo.path}`);
            continue;
        }
        if (fs.statSync(fileInfo.path).isDirectory()) {
            await handleGame(fileInfo.path);
        } else {
            console.log(`Skipping non-directory: ${fileInfo.path}`);
        }
    }
}

main().catch(console.error);