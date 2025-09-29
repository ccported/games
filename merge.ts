




// Combine part files into a single file by concatenation 
// <filename>.part1, <filename>.part2, ... -> return new Response width combined data
async function merge(filename: string): Promise<Response> {
    let partIndex = 1;
    let dataBuffers: ArrayBuffer[] = [];


    while (true) {
        const partFilename = `${filename}.part${partIndex}`;
        try {
            const partRes = await fetch(partFilename);
            if (!partRes.ok) {
                // No more parts found, exit the loop
                break;
            }
            const partData = await partRes.arrayBuffer();
            dataBuffers.push(partData);
            partIndex++;
        } catch (error) {
            console.error(`Error fetching ${partFilename}:`, error);
            break;
        }
    }

    const combinedData = new Uint8Array(dataBuffers.reduce((acc, buffer) => acc + buffer.byteLength, 0));

    let offset = 0;
    for (const buffer of dataBuffers) {
        combinedData.set(new Uint8Array(buffer), offset);
        offset += buffer.byteLength;
    }
    return new Response(combinedData);
}


