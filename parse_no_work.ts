import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { execSync } from 'child_process';

const noWork = path.join(__dirname, 'no_work.txt');

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

async function main(): Promise<void>{
    try {
        const data = await readFile(noWork, 'utf8');
        const rows = data.split('\n');
        const rowFiltered = rows.map(row => row.trim()).filter(row => row.length > 0);
        rowFiltered.forEach((row) => {
            const [id, check, ...error] = row.split(' ');
            let works = check === "[x]" ? true : false;
            

            if (works) {
                execSync(`cd `)
            }
        })

        
    } catch (err) {
        console.error(err);
    }
}


main().then(() => {
    console.log("Parse complete");
}).catch((err) => {
    console.