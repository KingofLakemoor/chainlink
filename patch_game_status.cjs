const fs = require('fs');
const file = 'src/services/propGrader.ts';
let code = fs.readFileSync(file, 'utf8');

// Replace fetchGameStatus signature
code = code.replace(/async function fetchGameStatus\(config: PropAthleteConfig\): Promise<GameStatus> \{/,
`async function fetchGameStatus(adminDb: any, config: PropAthleteConfig): Promise<GameStatus> {
    try {
        const doc = await adminDb.collection('matchups').doc(config.gameId).get();
        if (doc.exists) {
            const data = doc.data();
            return {
                status: data.status === 'STATUS_FINAL' ? 'STATUS_FINAL' : 'STATUS_IN_PROGRESS',
                detail: data.statusDesc || 'In Progress',
                period: 0
            };
        }
    } catch (e) {
        // Fallback to ESPN if db fetch fails
    }`);

// Replace calls
code = code.replace(/fetchGameStatus\(m\.metadata\.optionA\)/g, 'fetchGameStatus(adminDb, m.metadata.optionA)');
code = code.replace(/fetchGameStatus\(m\.metadata\.optionB\)/g, 'fetchGameStatus(adminDb, m.metadata.optionB)');

fs.writeFileSync(file, code);
