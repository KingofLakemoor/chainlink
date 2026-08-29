const fs = require('fs');
const file = 'src/apiRouter.ts';
let content = fs.readFileSync(file, 'utf8');

const patchTarget = `        const sanitizedPicks = picks.filter((p: any) => p !== null);

        transaction.update(pickRef, {`;
const patchReplacement = `        const sanitizedPicks = picks.filter((p: any) => p !== null);
        if (sanitizedPicks.length > 4) {
            throw new Error("Invalid submission. Cannot exceed 4 picks.");
        }

        transaction.update(pickRef, {`;
content = content.replace(patchTarget, patchReplacement);

const patchTarget2 = `        const sanitizedPicks = picks.filter((p: any) => p !== null);

        if (sanitizedPicks.length === 0) {`;
const patchReplacement2 = `        const sanitizedPicks = picks.filter((p: any) => p !== null);
        if (sanitizedPicks.length > 4) {
            throw new Error("Invalid submission. Cannot exceed 4 picks.");
        }

        if (sanitizedPicks.length === 0) {`;
content = content.replace(patchTarget2, patchReplacement2);

fs.writeFileSync(file, content, 'utf8');
console.log('Patched apiRouter.ts backend limits');
