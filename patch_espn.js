const fs = require('fs');
let code = fs.readFileSync('src/services/espnScraper.ts', 'utf8');

let blocks = code.split('metadata: {');

for (let i = 1; i < blocks.length; i++) {
    let block = blocks[i];
    // Find what variables are available
    let preceding = blocks[0];
    for (let j = 1; j < i; j++) preceding += 'metadata: {' + blocks[j];
    
    // Quick heuristic based on proximity
    let periodVar = '0';
    let lastComp = preceding.lastIndexOf('const comp = ');
    let lastCompetition = preceding.lastIndexOf('const competition = ');
    let lastForComp = preceding.lastIndexOf('for (let comp of');
    let lastForCompetition = preceding.lastIndexOf('for (const competition of');
    
    // We can just regex replace specific locations in espnScraper.ts using their exact matches
}
