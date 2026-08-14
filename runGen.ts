import { autoGenerateNFLProps } from './src/services/propGenerator.js';
async function run() {
    console.log("Generating...");
    const result = await autoGenerateNFLProps();
    console.log(result);
}
run();
