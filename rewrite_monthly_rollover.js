import fs from 'fs';
let content = fs.readFileSync('src/services/monthlyRollover.ts', 'utf8');

const regex = /export async function executeRollover\([\s\S]*\}\n?$/;

const newExecute = `export async function executeRollover(adminDb: FirebaseFirestore.Firestore, monthKeyToArchive: string) {
    let topCurrentChain: any = null;
    let topWins: any = null;
    let topBestChain: any = null;
    let topWinRate: any = null;
    
    const parts = monthKeyToArchive.split('-');
    const dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 15);
    const monthLabel = dateObj.toLocaleString('default', { month: 'long', year: 'numeric' });
    
    let batch = adminDb.batch();
    let count = 0;
    
    let lastDoc: any = null;
    let hasMore = true;
    
    while (hasMore) {
        let q = adminDb.collection('users').orderBy('__name__').limit(500);
        if (lastDoc) {
            q = q.startAfter(lastDoc);
        }
        
        const usersSnap = await q.get();
        if (usersSnap.empty) {
            hasMore = false;
            break;
        }
        
        lastDoc = usersSnap.docs[usersSnap.docs.length - 1];
        
        const userIds = usersSnap.docs.map(d => d.id);
        const chainsSnap = await adminDb.collection('chains').where('userId', 'in', userIds).get();
        const chainsMap = new Map();
        chainsSnap.docs.forEach(d => chainsMap.set(d.data().userId, { id: d.id, ...d.data() }));
        
        for (const doc of usersSnap.docs) {
            const data = doc.data();
            const chainData = chainsMap.get(doc.id) || { chain: 0, best: 0 };
            const wins = data.stats?.wins || 0;
            const losses = data.stats?.losses || 0;
            const pushes = data.stats?.pushes || 0;
            const total = wins + losses;
            const winRate = total > 0 ? (wins / total) * 100 : 0;
            
            const stats = {
                id: doc.id,
                username: data.username || data.name || 'A user',
                wins, losses, pushes, winRate,
                totalDecisions: total,
                currentChain: chainData.chain || 0,
                bestChain: chainData.best || 0,
            };
            
            if (!topCurrentChain || stats.currentChain > topCurrentChain.currentChain) topCurrentChain = stats;
            if (!topWins || stats.wins > topWins.wins) topWins = stats;
            if (!topBestChain || stats.bestChain > topBestChain.bestChain) topBestChain = stats;
            if (stats.totalDecisions >= 10) {
                if (!topWinRate || stats.winRate > topWinRate.winRate || (stats.winRate === topWinRate.winRate && stats.wins > topWinRate.wins)) {
                    topWinRate = stats;
                }
            }
            
            const userRef = adminDb.collection('users').doc(stats.id);
            let allTimeStats = data.allTimeStats || { wins: stats.wins, losses: stats.losses, pushes: stats.pushes };
            let historicalStats = data.historicalStats || {};
            historicalStats[monthKeyToArchive] = {
                monthKey: monthKeyToArchive,
                monthLabel,
                wins: stats.wins,
                losses: stats.losses,
                pushes: stats.pushes,
                longestWinChain: stats.bestChain,
                longestLossChain: 0,
                endOfMonthChain: stats.currentChain,
            };
            
            batch.update(userRef, { allTimeStats, historicalStats, stats: { wins: 0, losses: 0, pushes: 0 } });
            count++;
            
            if (chainData.id) {
                const chainRef = adminDb.collection('chains').doc(chainData.id);
                let allTimeBest = Math.max(chainData.allTimeBest || 0, data.allTimeBest || 0, stats.bestChain || 0);
                batch.update(chainRef, { chain: 0, best: 0, wins: 0, losses: 0, allTimeBest });
                count++;
            }
            
            if (count >= 400) {
                await batch.commit();
                batch = adminDb.batch();
                count = 0;
            }
        }
    }

    if (count > 0) {
        await batch.commit();
    }
    
    // Create notification
    const lines = [];
    if (topCurrentChain) lines.push(\`🔥 Longest Active Chain: \${topCurrentChain.username} (\${topCurrentChain.currentChain < 0 ? 'L' + Math.abs(topCurrentChain.currentChain) : 'W' + topCurrentChain.currentChain})\`);
    if (topBestChain) lines.push(\`🏆 Best Monthly Chain: \${topBestChain.username} (W\${topBestChain.bestChain})\`);
    if (topWins) lines.push(\`🥇 Most Wins: \${topWins.username} (\${topWins.wins} Wins)\`);
    if (topWinRate) lines.push(\`🎯 Best Win %: \${topWinRate.username} (\${topWinRate.winRate.toFixed(1)}%)\`);
    
    const notifBody = lines.length > 0 ? lines.join('\\n') : 'No stats for this month.';
    const globalNotifRef = adminDb.collection('notifications').doc();
    await globalNotifRef.set({
      title: 'Monthly Winners! 🏅',
      body: \`The month has concluded! Here are the winners:\\n\\n\${notifBody}\`,
      audience: 'GLOBAL',
      status: 'PENDING',
      scheduledTime: Date.now(),
      createdAt: Date.now()
    });

    console.log('Automated monthly rollover completed successfully.');
}
`;

content = content.replace(regex, newExecute);
fs.writeFileSync('src/services/monthlyRollover.ts', content);
console.log("Patched monthlyRollover.ts");
