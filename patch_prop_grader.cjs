const fs = require('fs');
let code = fs.readFileSync('src/services/propGrader.ts', 'utf8');

if (!code.includes('updateAllProps')) {
  code += `
import * as firebaseAdmin from '../lib/firebase-admin.js';

export async function updateAllProps() {
    const adminDb = firebaseAdmin.adminDb;
    if (!adminDb) return;
    
    try {
        const snap = await adminDb.collection('matchups')
            .where('type', '==', 'STATS')
            .where('status', 'in', ['STATUS_SCHEDULED', 'STATUS_IN_PROGRESS'])
            .get();
            
        let batch = adminDb.batch();
        let count = 0;
        
        for (const doc of snap.docs) {
            const m = doc.data();
            if (!m.metadata?.isPropMatchup) continue;
            
            const valueA = await fetchPlayerStat(m.metadata.optionA, m.metadata.timeframe);
            const valueB = await fetchPlayerStat(m.metadata.optionB, m.metadata.timeframe);
            
            if (valueA !== null && valueB !== null) {
                // Determine if both games are final
                const statusA = await fetchGameStatus(m.metadata.optionA);
                const statusB = await fetchGameStatus(m.metadata.optionB);
                
                let newStatus = 'STATUS_IN_PROGRESS';
                if (statusA === 'STATUS_FINAL' && statusB === 'STATUS_FINAL') {
                    newStatus = 'STATUS_FINAL';
                }
                
                batch.update(doc.ref, {
                    'awayTeam.score': valueA,
                    'homeTeam.score': valueB,
                    status: newStatus
                });
                count++;
            }
        }
        
        if (count > 0) {
            await batch.commit();
            console.log(\`[propGrader] Updated \${count} prop matchups.\`);
        }
    } catch (e) {
        console.error("Error in updateAllProps:", e);
    }
}

async function fetchGameStatus(config: PropAthleteConfig): Promise<string> {
    try {
        let sport = '';
        let leaguePath = '';
        switch (config.league) {
            case 'MLB': sport = 'baseball'; leaguePath = 'mlb'; break;
            case 'NFL': sport = 'football'; leaguePath = 'nfl'; break;
            case 'CFB': sport = 'football'; leaguePath = 'college-football'; break;
            case 'NBA': sport = 'basketball'; leaguePath = 'nba'; break;
        }
        const url = \`https://site.api.espn.com/apis/site/v2/sports/\${sport}/\${leaguePath}/summary?event=\${config.gameId}\`;
        const res = await fetch(url);
        if (!res.ok) return 'STATUS_IN_PROGRESS';
        const data = await res.json();
        const rawStatus = data.header?.competitions?.[0]?.status?.type?.name;
        if (rawStatus === 'STATUS_FINAL') return 'STATUS_FINAL';
        return 'STATUS_IN_PROGRESS';
    } catch {
        return 'STATUS_IN_PROGRESS';
    }
}
`;
}

fs.writeFileSync('src/services/propGrader.ts', code);
