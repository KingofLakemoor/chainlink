import cron from 'node-cron';
import admin from 'firebase-admin';

export function startMonthlyRolloverJob() {
  // Run on the 1st of every month at 00:00 (midnight)
  cron.schedule('0 0 1 * *', async () => {
    console.log('Initiating automated monthly rollover...');
    try {
      const adminDb = admin.firestore();
      const date = new Date();
      // We want to process the rollover for the month that just ended.
      // So if it's Aug 1, we are rolling over July.
      date.setMonth(date.getMonth() - 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      const rolloverLockRef = adminDb.collection('systemSettings').doc('monthlyRollover');
      
      let alreadyRun = false;
      await adminDb.runTransaction(async (t) => {
        const doc = await t.get(rolloverLockRef);
        if (doc.exists) {
          const data = doc.data();
          if (data && data.lastRolloverMonth === monthKey) {
            console.log(`Monthly rollover for ${monthKey} was already completed.`);
            alreadyRun = true;
            return;
          }
        }
        
        // Lock it
        t.set(rolloverLockRef, { lastRolloverMonth: monthKey, timestamp: Date.now() }, { merge: true });
      });

      if (alreadyRun) {
        return;
      }

      // Execute Rollover logic
      // We can refactor the logic from apiRouter.ts or just duplicate it here for the cron.
      // Let's call a shared function or duplicate it for safety.
      await executeRollover(adminDb, monthKey);
      
    } catch (e) {
      console.error('Error during automated monthly rollover:', e);
    }
  }, {
    timezone: "America/Los_Angeles" // Assuming Club 602 is PST/PDT based on typical users, or we can use UTC.
  });
}

export async function executeRollover(adminDb: FirebaseFirestore.Firestore, monthKeyToArchive: string) {
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

        if (usersSnap.docs.length < 500) {
            hasMore = false;
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
            const existingAllTime = data.allTimeStats || {};
            const allTimeStats = {
              wins: existingAllTime.wins ?? stats.wins,
              losses: existingAllTime.losses ?? stats.losses,
              pushes: existingAllTime.pushes ?? stats.pushes,
            };
            const historicalStats = data.historicalStats || {};
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
            
            const userAllTimeBest = Math.max(data.allTimeBest || 0, stats.bestChain || 0);

            batch.update(userRef, {
              allTimeStats,
              historicalStats,
              allTimeBest: userAllTimeBest,
              stats: { wins: 0, losses: 0, pushes: 0 }
            });
            count++;
            
            if (chainData.id) {
                const chainRef = adminDb.collection('chains').doc(chainData.id);
                const chainAllTimeBest = Math.max(chainData.allTimeBest || 0, data.allTimeBest || 0, stats.bestChain || 0);
                batch.update(chainRef, { chain: 0, best: 0, wins: 0, losses: 0, allTimeBest: chainAllTimeBest });
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
    if (topCurrentChain) lines.push(`🔥 Longest Active Chain: ${topCurrentChain.username} (${topCurrentChain.currentChain < 0 ? 'L' + Math.abs(topCurrentChain.currentChain) : 'W' + topCurrentChain.currentChain})`);
    if (topBestChain) lines.push(`🏆 Best Monthly Chain: ${topBestChain.username} (W${topBestChain.bestChain})`);
    if (topWins) lines.push(`🥇 Most Wins: ${topWins.username} (${topWins.wins} Wins)`);
    if (topWinRate) lines.push(`🎯 Best Win %: ${topWinRate.username} (${topWinRate.winRate.toFixed(1)}%)`);
    
    const notifBody = lines.length > 0 ? lines.join('\n') : 'No stats for this month.';
    const globalNotifRef = adminDb.collection('notifications').doc();
    await globalNotifRef.set({
      title: 'Monthly Winners! 🏅',
      body: `The month has concluded! Here are the winners:\n\n${notifBody}`,
      audience: 'GLOBAL',
      status: 'PENDING',
      scheduledTime: Date.now(),
      createdAt: Date.now()
    });

    console.log('Automated monthly rollover completed successfully.');
}
