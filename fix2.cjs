const fs = require('fs');
let code = fs.readFileSync('src/services/espnScraper.ts', 'utf-8');

code = code.replace(/export function extractLine\\(str: string \\| null \\| undefined\\): string \\| null \\{\\n    if \\(!str\\) return null;\\n    const match = str\\.match\\(\\/\\(\\[\\+-\\]\\?\\\\d\\+\\\\.\\\?\\\\d\\*\\)\\/\\);/g, 
\`export function extractLine(str: any): string | null {
    if (str === null || str === undefined) return null;
    if (typeof str === 'number') str = String(str);
    if (typeof str !== 'string') return null;
    const match = str.match(/([+-]?\\\\d+\\\\.\\\\d*)/);\`);

fs.writeFileSync('src/services/espnScraper.ts', code);
