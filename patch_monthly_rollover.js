import fs from 'fs';
let content = fs.readFileSync('src/services/monthlyRollover.ts', 'utf8');

const oldExecute = `export async function executeRollover(adminDb: FirebaseFirestore.Firestore, monthKeyToArchive: string) {
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
    })[0] : null;`;

const newExecute = `export async function executeRollover(adminDb: FirebaseFirestore.Firestore, monthKeyToArchive: string) {
    // 1. Calculate winners & Archive stats via batched streaming
    let topCurrentChain: any = null;
    let topWins: any = null;
    let topBestChain: any = null;
    let topWinRate: any = null;
    
    const parts = monthKeyToArchive.split('-');
    const dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 15);
    const monthLabel = dateObj.toLocaleString('default', { month: 'long', year: 'numeric' });
    
    let batch = adminDb.batch();
    let count = 0;
    
    // We use a paginated approach to avoid loading the entire database into memory at once
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
        
        // Fetch chains for this chunk of users
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
            
            // Track winners
            if (!topCurrentChain || stats.currentChain > topCurrentChain.currentChain) topCurrentChain = stats;
            if (!topWins || stats.wins > topWins.wins) topWins = stats;
            if (!topBestChain || stats.bestChain > topBestChain.bestChain) topBestChain = stats;
            if (stats.totalDecisions >= 10) {
                if (!topWinRate || stats.winRate > topWinRate.winRate || (stats.winRate === topWinRate.winRate && stats.wins > topWinRate.wins)) {
                    topWinRate = stats;
                }
            }
            
            // Queue archive updates
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
    }`;

const oldGlobalNotif = `    // 2. Archiving and Resetting
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
    }`;

if (content.includes("const usersSnap = await adminDb.collection('users').get();")) {
    // We basically need to replace everything in executeRollover.
    // It's easier to just rebuild it.
    console.log("Patching executeRollover entirely.");
}

