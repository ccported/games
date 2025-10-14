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
            let works = check === "[x]" ? false : true;

            if (works) {
                const pathToParse = path.join(__dirname, id);
                console.log(pathToParse, check, id);
                execSync(`cd ${path.join(__dirname, id)} && aws s3 cp index.html s3://ccportedgames/${id}/index.html`, { stdio: 'inherit' });

            }
        })

        
    } catch (err) {
        console.error(err);
    }
}


main().then(() => {
    console.log("Parse complete");
}).catch((err) => {
    console.error(err);
})