const fs = require('fs');
const file = 'src/apiRouter.ts';
let content = fs.readFileSync(file, 'utf8');

const patchTarget = `        // Only store non-null picks
        const sanitizedPicks = picks.filter((p: any) => p !== null);`;

const patchReplacement = `        const sanitizedPicks = picks.filter((p: any) => p !== null);
        
        // Validate newly added picks
        for (let i = currentPicks.length; i < sanitizedPicks.length; i++) {
            const newPick = sanitizedPicks[i];
            const mId = newPick.id.replace('pick-', '');
            const matchupRef = adminDb.collection('link4Matchups').doc(\`\${segmentId}_\${mId}\`);
            const mDoc = await transaction.get(matchupRef);
            if (!mDoc.exists) throw new Error("Invalid matchup selected.");
            const mData = mDoc.data();
            if (mData.status !== 'STATUS_SCHEDULED') throw new Error("Cannot pick a game that has already started.");
            if (mData.startTime && mData.startTime <= Date.now()) throw new Error("Matchup is locked.");
        }`;

content = content.replace(patchTarget, patchReplacement);

const patchTarget2 = `        // First pick, deduct fee
        if (currentLinks < cost) {`;

const patchReplacement2 = `        // First pick, deduct fee
        const sanitizedPicks = picks.filter((p: any) => p !== null);
        // Validate newly added picks
        for (let i = 0; i < sanitizedPicks.length; i++) {
            const newPick = sanitizedPicks[i];
            const mId = newPick.id.replace('pick-', '');
            const matchupRef = adminDb.collection('link4Matchups').doc(\`\${segmentId}_\${mId}\`);
            const mDoc = await transaction.get(matchupRef);
            if (!mDoc.exists) throw new Error("Invalid matchup selected.");
            const mData = mDoc.data();
            if (mData.status !== 'STATUS_SCHEDULED') throw new Error("Cannot pick a game that has already started.");
            if (mData.startTime && mData.startTime <= Date.now()) throw new Error("Matchup is locked.");
        }

        if (currentLinks < cost) {`;

content = content.replace(patchTarget2, patchReplacement2);

const patchTarget3 = `        const sanitizedPicks = picks.filter((p: any) => p !== null);
        if (sanitizedPicks.length > 4) {
            throw new Error("Invalid submission. Cannot exceed 4 picks.");
        }

        if (sanitizedPicks.length === 0) {`;

const patchReplacement3 = `        if (sanitizedPicks.length > 4) {
            throw new Error("Invalid submission. Cannot exceed 4 picks.");
        }

        if (sanitizedPicks.length === 0) {`;

content = content.replace(patchTarget3, patchReplacement3);

fs.writeFileSync(file, content, 'utf8');
console.log('Patched apiRouter.ts backend security validations');
