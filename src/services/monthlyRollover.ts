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
    const usersSnap = await adminDb.collection('users').get();
    const chainsSnap = await adminDb.collection('chains').get();
    
    const chainsMap = new Map();
    chainsSnap.docs.forEach(doc => {
      chainsMap.set(doc.data().userId, { id: doc.id, ...doc.data() });
    });

    const currentMonthStats = usersSnap.docs.map(doc => {
      const data = doc.data();
      const chainData = chainsMap.get(doc.id) || { chain: 0, best: 0 };
      const wins = data.stats?.wins || 0;
      const losses = data.stats?.losses || 0;
      const pushes = data.stats?.pushes || 0;
      const total = wins + losses;
      const winRate = total > 0 ? (wins / total) * 100 : 0;
      
      return {
        id: doc.id,
        username: data.username || data.name || 'A user',
        wins,
        losses,
        pushes,
        winRate,
        totalDecisions: total,
        currentChain: chainData.chain || 0,
        bestChain: chainData.best || 0,
        chainDocId: chainData.id,
        userData: data,
        chainData: chainData,
      };
    });

    // 1. Calculate winners
    const topCurrentChain = [...currentMonthStats].sort((a, b) => b.currentChain - a.currentChain)[0];
    const topWins = [...currentMonthStats].sort((a, b) => b.wins - a.wins)[0];
    const topBestChain = [...currentMonthStats].sort((a, b) => b.bestChain - a.bestChain)[0];
    const eligibleForWinRate = currentMonthStats.filter(p => p.totalDecisions >= 10);
    const topWinRate = eligibleForWinRate.length > 0 ? [...eligibleForWinRate].sort((a, b) => {
      if (b.winRate !== a.winRate) return b.winRate - a.winRate;
      return b.wins - a.wins;
    })[0] : null;

    // Build the global notification body
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

    // 2. Archiving and Resetting
    const parts = monthKeyToArchive.split('-');
    const dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 15);
    const monthLabel = dateObj.toLocaleString('default', { month: 'long', year: 'numeric' });

    let batch = adminDb.batch();
    let count = 0;

    for (const user of currentMonthStats) {
      const userRef = adminDb.collection('users').doc(user.id);
      
      let allTimeStats = user.userData.allTimeStats;
      if (!allTimeStats) {
        allTimeStats = { wins: user.wins, losses: user.losses, pushes: user.pushes };
      }
      
      let historicalStats = user.userData.historicalStats || {};
      historicalStats[monthKeyToArchive] = {
        monthKey: monthKeyToArchive,
        monthLabel,
        wins: user.wins,
        losses: user.losses,
        pushes: user.pushes,
        longestWinChain: user.bestChain,
        longestLossChain: 0,
        endOfMonthChain: user.currentChain,
      };

      batch.update(userRef, {
        allTimeStats,
        historicalStats,
        stats: { wins: 0, losses: 0, pushes: 0 }
      });
      count++;

      if (user.chainDocId) {
        const chainRef = adminDb.collection('chains').doc(user.chainDocId);
        let allTimeBest = Math.max(user.chainData.allTimeBest || 0, user.userData.allTimeBest || 0, user.bestChain || 0);
        batch.update(chainRef, {
          chain: 0,
          best: 0,
          wins: 0,
          losses: 0,
          allTimeBest
        });
        count++;
      }

      if (count >= 400) {
        await batch.commit();
        batch = adminDb.batch();
        count = 0;
      }
    }

    if (count > 0) {
      await batch.commit();
    }
    console.log('Automated monthly rollover completed successfully.');
}
