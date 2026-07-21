import * as fs from 'fs';

const content = fs.readFileSync('src/pages/pickem/PickEmPage.tsx', 'utf8');
console.log(content.substring(0, 500));
