const fs = require('fs');
const file = 'src/apiRouter.ts';
let content = fs.readFileSync(file, 'utf8');

const patchTarget = `        if (currentLinks < cost) {
          throw new Error(\`Not enough links. Link4 requires \${cost} links to enter.\`);
        }

        const sanitizedPicks = picks.filter((p: any) => p !== null);
        if (sanitizedPicks.length === 0) {`;

const patchReplacement = `        if (currentLinks < cost) {
          throw new Error(\`Not enough links. Link4 requires \${cost} links to enter.\`);
        }

        if (sanitizedPicks.length === 0) {`;

content = content.replace(patchTarget, patchReplacement);

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed double declaration in apiRouter.ts');
