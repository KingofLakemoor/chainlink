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

      await executeRollover(adminDb, monthKey);
    } catch (e) {
      console.error('Error during automated monthly rollover:', e);
    }
  }, {
    timezone: "America/Los_Angeles"
  });
}

/**
 * Compare two participants for Best Chain (Longest Win Streak).
 * Primary: bestChain (descending)
 * Tiebreaker 1: Total Wins in the month (descending)
 * Tiebreaker 2: Win Percentage in the month (descending)
 * Tiebreaker 3: End of Month Active Current Chain (descending)
 * Tiebreaker 4: Total Decisions / Fewer Losses (descending)
 * Tiebreaker 5: User ID for deterministic stability
 */
export function compareBestChain(a: any, b: any): number {
  const bBest = b.bestChain || 0;
  const aBest = a.bestChain || 0;
  if (bBest !== aBest) return bBest - aBest;

  const bWins = b.wins || 0;
  const aWins = a.wins || 0;
  if (bWins !== aWins) return bWins - aWins;

  const bRate = b.winRate || 0;
  const aRate = a.winRate || 0;
  if (bRate !== aRate) return bRate - aRate;

  const bCur = b.currentChain || 0;
  const aCur = a.currentChain || 0;
  if (bCur !== aCur) return bCur - aCur;

  const bTotal = b.totalDecisions || 0;
  const aTotal = a.totalDecisions || 0;
  if (bTotal !== aTotal) return bTotal - aTotal;

  return String(a.id || a.userId).localeCompare(String(b.id || b.userId));
}

/**
 * Compare two participants for Current Chain (Active streak at month end).
 * Primary: currentChain (descending: W10 > W5 > 0 > L1 > L5)
 * Tiebreaker 1: Longest Win Streak (bestChain descending)
 * Tiebreaker 2: Total Wins in the month (descending)
 * Tiebreaker 3: Win Percentage in the month (descending)
 */
export function compareCurrentChain(a: any, b: any): number {
  const bCur = b.currentChain || 0;
  const aCur = a.currentChain || 0;
  if (bCur !== aCur) return bCur - aCur;

  const bBest = b.bestChain || 0;
  const aBest = a.bestChain || 0;
  if (bBest !== aBest) return bBest - aBest;

  const bWins = b.wins || 0;
  const aWins = a.wins || 0;
  if (bWins !== aWins) return bWins - aWins;

  const bRate = b.winRate || 0;
  const aRate = a.winRate || 0;
  if (bRate !== aRate) return bRate - aRate;

  return String(a.id || a.userId).localeCompare(String(b.id || b.userId));
}

/**
 * Compare two participants for Total Wins.
 * Primary: Total Wins (descending)
 * Tiebreaker 1: Win Rate (descending)
 * Tiebreaker 2: Longest Win Streak (bestChain descending)
 * Tiebreaker 3: Current Chain (descending)
 */
export function compareMostWins(a: any, b: any): number {
  const bWins = b.wins || 0;
  const aWins = a.wins || 0;
  if (bWins !== aWins) return bWins - aWins;

  const bRate = b.winRate || 0;
  const aRate = a.winRate || 0;
  if (bRate !== aRate) return bRate - aRate;

  const bBest = b.bestChain || 0;
  const aBest = a.bestChain || 0;
  if (bBest !== aBest) return bBest - aBest;

  const bCur = b.currentChain || 0;
  const aCur = a.currentChain || 0;
  if (bCur !== aCur) return bCur - aCur;

  return String(a.id || a.userId).localeCompare(String(b.id || b.userId));
}

/**
 * Compare two participants for Win Percentage (Min 10 decisions).
 * Primary: Win Rate (descending)
 * Tiebreaker 1: Total Wins (descending)
 * Tiebreaker 2: Longest Win Streak (bestChain descending)
 * Tiebreaker 3: Current Chain (descending)
 */
export function compareWinRate(a: any, b: any): number {
  const bRate = b.winRate || 0;
  const aRate = a.winRate || 0;
  if (bRate !== aRate) return bRate - aRate;

  const bWins = b.wins || 0;
  const aWins = a.wins || 0;
  if (bWins !== aWins) return bWins - aWins;

  const bBest = b.bestChain || 0;
  const aBest = a.bestChain || 0;
  if (bBest !== aBest) return bBest - aBest;

  const bCur = b.currentChain || 0;
  const aCur = a.currentChain || 0;
  if (bCur !== aCur) return bCur - aCur;

  return String(a.id || a.userId).localeCompare(String(b.id || b.userId));
}

/**
 * Standard Standings Sort for Leaderboard:
 * 1. Current Chain descending (Active streak)
 * 2. Best Chain descending (Longest Chain with tiebreakers)
 * 3. Most Wins descending
 * 4. Win Rate descending
 * 5. Deterministic tiebreaker (id)
 */
export function compareLeaderboardStanding(a: any, b: any): number {
  const aCur = a.currentChain || 0;
  const bCur = b.currentChain || 0;
  if (bCur !== aCur) return bCur - aCur;

  const aBest = a.bestChain || 0;
  const bBest = b.bestChain || 0;
  if (bBest !== aBest) return bBest - aBest;

  const aW = a.wins || 0;
  const bW = b.wins || 0;
  if (bW !== aW) return bW - aW;

  const aRate = a.winRate || 0;
  const bRate = b.winRate || 0;
  if (bRate !== aRate) return bRate - aRate;

  return String(a.id || a.userId).localeCompare(String(b.id || b.userId));
}

export interface MonthlyParticipant {
  id: string;
  userId: string;
  username: string;
  name: string;
  displayName?: string;
  image: string;
  wins: number;
  losses: number;
  pushes: number;
  totalDecisions: number;
  winRate: number;
  currentChain: number;
  bestChain: number;
  allTimeBest: number;
  equippedCosmetics?: any;
  userRef: any;
  chainRef?: any;
  chainAllTimeBest: number;
  existingAllTime: any;
  historicalStats: any;
  rank?: number;
}

export async function executeRollover(adminDb: FirebaseFirestore.Firestore, monthKeyToArchive: string) {
  const parts = monthKeyToArchive.split('-');
  const dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 15);
  const monthLabel = dateObj.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Phase 1: Collect all participants and their chains before resetting
  const participants: MonthlyParticipant[] = [];
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
    chainsSnap.docs.forEach(d => chainsMap.set(d.data().userId, { id: d.id, ref: d.ref, ...d.data() }));

    for (const doc of usersSnap.docs) {
      const data = doc.data();
      const chainData = chainsMap.get(doc.id) || { chain: 0, best: 0, allTimeBest: 0 };
      const wins = data.stats?.wins || 0;
      const losses = data.stats?.losses || 0;
      const pushes = data.stats?.pushes || 0;
      const total = wins + losses;
      const winRate = total > 0 ? (wins / total) * 100 : 0;
      const currentChain = chainData.chain || 0;
      const bestChain = chainData.best || 0;
      const userAllTimeBest = Math.max(data.allTimeBest || 0, bestChain);
      const chainAllTimeBest = Math.max(chainData.allTimeBest || 0, data.allTimeBest || 0, bestChain);

      participants.push({
        id: doc.id,
        userId: doc.id,
        username: data.username || data.name || 'A user',
        name: data.name || data.username || 'A user',
        displayName: data.username || data.name || 'A user',
        image: data.image || '',
        wins,
        losses,
        pushes,
        totalDecisions: total,
        winRate,
        currentChain,
        bestChain,
        allTimeBest: userAllTimeBest,
        equippedCosmetics: data.equippedCosmetics || null,
        userRef: doc.ref,
        chainRef: chainData.ref || null,
        chainAllTimeBest,
        existingAllTime: data.allTimeStats || {},
        historicalStats: data.historicalStats || {},
      });
    }
  }

  // Phase 2: Compute cemented winners with full tiebreaker support
  let topCurrentChain: MonthlyParticipant | null = null;
  let topBestChain: MonthlyParticipant | null = null;
  let topWins: MonthlyParticipant | null = null;
  let topWinRate: MonthlyParticipant | null = null;

  for (const p of participants) {
    if (!topCurrentChain || compareCurrentChain(p, topCurrentChain) < 0) {
      topCurrentChain = p;
    }
    if (!topBestChain || compareBestChain(p, topBestChain) < 0) {
      topBestChain = p;
    }
    if (!topWins || compareMostWins(p, topWins) < 0) {
      topWins = p;
    }
    if (p.totalDecisions >= 10) {
      if (!topWinRate || compareWinRate(p, topWinRate) < 0) {
        topWinRate = p;
      }
    }
  }

  // Sort overall standings for leaderboard snapshot and assign 1-based ranks
  const sortedStandings = [...participants].sort(compareLeaderboardStanding);
  sortedStandings.forEach((p, idx) => {
    p.rank = idx + 1;
  });

  // Calculate totals
  const totalWins = participants.reduce((sum, p) => sum + p.wins, 0);
  const totalLosses = participants.reduce((sum, p) => sum + p.losses, 0);
  const totalPushes = participants.reduce((sum, p) => sum + p.pushes, 0);
  const totalDecisions = totalWins + totalLosses;
  const globalWinRate = totalDecisions > 0 ? (totalWins / totalDecisions) * 100 : 0;

  // Active participants with activity (for snapshot leaderboard)
  const activeStandings = sortedStandings.filter(p => p.totalDecisions > 0 || p.currentChain !== 0);
  const standingsToSave = activeStandings.length > 0 ? activeStandings : sortedStandings;

  // Phase 3: Create cemented snapshot in monthlyResults/{monthKeyToArchive}
  const monthlySnapshot = {
    monthKey: monthKeyToArchive,
    monthLabel,
    completedAt: Date.now(),
    totalParticipants: standingsToSave.length,
    totalWins,
    totalLosses,
    totalPushes,
    globalWinRate: Number(globalWinRate.toFixed(1)),
    winners: {
      topCurrentChain: topCurrentChain ? {
        userId: topCurrentChain.id,
        username: topCurrentChain.username,
        name: topCurrentChain.name,
        displayName: topCurrentChain.displayName || topCurrentChain.username || topCurrentChain.name,
        image: topCurrentChain.image,
        currentChain: topCurrentChain.currentChain,
        bestChain: topCurrentChain.bestChain,
        wins: topCurrentChain.wins,
        losses: topCurrentChain.losses,
        winRate: topCurrentChain.winRate,
        equippedCosmetics: topCurrentChain.equippedCosmetics || null
      } : null,
      topBestChain: topBestChain ? {
        userId: topBestChain.id,
        username: topBestChain.username,
        name: topBestChain.name,
        displayName: topBestChain.displayName || topBestChain.username || topBestChain.name,
        image: topBestChain.image,
        bestChain: topBestChain.bestChain,
        currentChain: topBestChain.currentChain,
        wins: topBestChain.wins,
        losses: topBestChain.losses,
        winRate: topBestChain.winRate,
        equippedCosmetics: topBestChain.equippedCosmetics || null,
        tiebreakerNote: `Tiebreakers: ${topBestChain.wins} Wins, ${topBestChain.winRate.toFixed(1)}% Win Rate, W${topBestChain.currentChain} Active Chain`
      } : null,
      topWins: topWins ? {
        userId: topWins.id,
        username: topWins.username,
        name: topWins.name,
        displayName: topWins.displayName || topWins.username || topWins.name,
        image: topWins.image,
        wins: topWins.wins,
        losses: topWins.losses,
        winRate: topWins.winRate,
        bestChain: topWins.bestChain,
        currentChain: topWins.currentChain,
        equippedCosmetics: topWins.equippedCosmetics || null
      } : null,
      topWinRate: topWinRate ? {
        userId: topWinRate.id,
        username: topWinRate.username,
        name: topWinRate.name,
        displayName: topWinRate.displayName || topWinRate.username || topWinRate.name,
        image: topWinRate.image,
        winRate: topWinRate.winRate,
        wins: topWinRate.wins,
        losses: topWinRate.losses,
        totalDecisions: topWinRate.totalDecisions,
        bestChain: topWinRate.bestChain,
        currentChain: topWinRate.currentChain,
        equippedCosmetics: topWinRate.equippedCosmetics || null
      } : null,
    },
    rankings: standingsToSave.map((p, idx) => ({
      rank: idx + 1,
      id: p.id,
      userId: p.id,
      username: p.username,
      name: p.name,
      displayName: p.displayName || p.username,
      image: p.image,
      stats: { wins: p.wins, losses: p.losses, pushes: p.pushes },
      currentChain: p.currentChain, // cemented end-of-month chain!
      bestChain: p.bestChain,       // cemented longest win streak!
      winRate: p.winRate,
      totalDecisions: p.totalDecisions,
      equippedCosmetics: p.equippedCosmetics || null
    }))
  };

  try {
    const monthlyResultDoc = adminDb.collection('monthlyResults').doc(monthKeyToArchive);
    if (monthlyResultDoc && typeof monthlyResultDoc.set === 'function') {
      await monthlyResultDoc.set(monthlySnapshot);
    }
  } catch (err) {
    console.error('Error saving monthlyResults document snapshot:', err);
  }

  // Phase 4: Cement historical stats on users and reset live monthly stats/chains
  let batch = adminDb.batch();
  let count = 0;

  for (const p of participants) {
    const allTimeStats = {
      wins: (p.existingAllTime.wins ?? 0) + (p.existingAllTime.wins !== undefined ? 0 : p.wins),
      losses: (p.existingAllTime.losses ?? 0) + (p.existingAllTime.losses !== undefined ? 0 : p.losses),
      pushes: (p.existingAllTime.pushes ?? 0) + (p.existingAllTime.pushes !== undefined ? 0 : p.pushes),
    };

    const historicalStats = p.historicalStats || {};
    historicalStats[monthKeyToArchive] = {
      monthKey: monthKeyToArchive,
      monthLabel,
      wins: p.wins,
      losses: p.losses,
      pushes: p.pushes,
      longestWinChain: p.bestChain,
      longestLossChain: 0,
      endOfMonthChain: p.currentChain,
      winRate: p.winRate,
      totalDecisions: p.totalDecisions,
      rank: p.rank || 0,
      completedAt: Date.now()
    };

    batch.update(p.userRef, {
      allTimeStats,
      historicalStats,
      allTimeBest: p.allTimeBest,
      stats: { wins: 0, losses: 0, pushes: 0 }
    });
    count++;

    if (p.chainRef) {
      batch.update(p.chainRef, { chain: 0, best: 0, wins: 0, losses: 0, allTimeBest: p.chainAllTimeBest });
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

  // Phase 5: Create announcement notification
  const lines: string[] = [];
  if (topCurrentChain) {
    lines.push(`🔥 Longest Active Chain: ${topCurrentChain.username} (${topCurrentChain.currentChain < 0 ? 'L' + Math.abs(topCurrentChain.currentChain) : 'W' + topCurrentChain.currentChain})`);
  }
  if (topBestChain) {
    lines.push(`🏆 Best Monthly Chain: ${topBestChain.username} (W${topBestChain.bestChain})`);
  }
  if (topWins) {
    lines.push(`🥇 Most Wins: ${topWins.username} (${topWins.wins} Wins)`);
  }
  if (topWinRate) {
    lines.push(`🎯 Best Win %: ${topWinRate.username} (${topWinRate.winRate.toFixed(1)}%)`);
  }

  const notifBody = lines.length > 0 ? lines.join('\n') : 'No stats for this month.';
  const globalNotifRef = adminDb.collection('notifications').doc();
  await globalNotifRef.set({
    title: 'Monthly Winners! 🏅',
    body: `The month of ${monthLabel} has concluded! Here are the winners:\n\n${notifBody}`,
    audience: 'GLOBAL',
    status: 'PENDING',
    scheduledTime: Date.now(),
    createdAt: Date.now()
  });

  console.log(`Automated monthly rollover for ${monthKeyToArchive} completed successfully with cemented snapshot.`);
  return monthlySnapshot;
}

/**
 * Retrieves a cemented monthly snapshot from Firestore.
 * If not yet created (e.g. from an earlier rollover), reconstructs it from users' historicalStats.
 */
export async function getOrBuildMonthlySnapshot(adminDb: FirebaseFirestore.Firestore, monthKey: string) {
  try {
    const snap = await adminDb.collection('monthlyResults').doc(monthKey).get();
    if (snap.exists) {
      return snap.data();
    }
  } catch (err) {
    console.warn(`Could not fetch monthlyResults/${monthKey}:`, err);
  }

  // Fallback: reconstruct from users collection
  const parts = monthKey.split('-');
  const dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 15);
  const monthLabel = dateObj.toLocaleString('default', { month: 'long', year: 'numeric' });

  const usersSnap = await adminDb.collection('users').get();
  const historicalParticipants: any[] = [];

  usersSnap.docs.forEach(doc => {
    const uData = doc.data();
    const hStats = uData.historicalStats?.[monthKey];
    if (hStats) {
      const wins = hStats.wins || 0;
      const losses = hStats.losses || 0;
      const pushes = hStats.pushes || 0;
      const totalDecisions = hStats.totalDecisions || (wins + losses);
      const winRate = hStats.winRate !== undefined ? hStats.winRate : (totalDecisions > 0 ? (wins / totalDecisions) * 100 : 0);
      const bestChain = hStats.longestWinChain || 0;
      const currentChain = hStats.endOfMonthChain || 0;

      historicalParticipants.push({
        id: doc.id,
        userId: doc.id,
        username: uData.username || uData.name || 'A user',
        name: uData.name || uData.username || 'A user',
        displayName: uData.username || uData.name || 'A user',
        image: uData.image || '',
        wins,
        losses,
        pushes,
        totalDecisions,
        winRate,
        currentChain,
        bestChain,
        equippedCosmetics: uData.equippedCosmetics || null,
      });
    }
  });

  if (historicalParticipants.length === 0) {
    return null;
  }

  // Evaluate winners with tiebreaker support
  let topCurrentChain: any = null;
  let topBestChain: any = null;
  let topWins: any = null;
  let topWinRate: any = null;

  for (const p of historicalParticipants) {
    if (!topCurrentChain || compareCurrentChain(p, topCurrentChain) < 0) {
      topCurrentChain = p;
    }
    if (!topBestChain || compareBestChain(p, topBestChain) < 0) {
      topBestChain = p;
    }
    if (!topWins || compareMostWins(p, topWins) < 0) {
      topWins = p;
    }
    if (p.totalDecisions >= 10) {
      if (!topWinRate || compareWinRate(p, topWinRate) < 0) {
        topWinRate = p;
      }
    }
  }

  const sorted = [...historicalParticipants].sort(compareLeaderboardStanding);
  const totalWins = historicalParticipants.reduce((sum, p) => sum + p.wins, 0);
  const totalLosses = historicalParticipants.reduce((sum, p) => sum + p.losses, 0);
  const totalPushes = historicalParticipants.reduce((sum, p) => sum + p.pushes, 0);
  const totalDecisions = totalWins + totalLosses;
  const globalWinRate = totalDecisions > 0 ? (totalWins / totalDecisions) * 100 : 0;

  const snapshot = {
    monthKey,
    monthLabel,
    completedAt: Date.now(),
    totalParticipants: sorted.length,
    totalWins,
    totalLosses,
    totalPushes,
    globalWinRate: Number(globalWinRate.toFixed(1)),
    winners: {
      topCurrentChain: topCurrentChain ? {
        userId: topCurrentChain.id,
        username: topCurrentChain.username,
        image: topCurrentChain.image,
        currentChain: topCurrentChain.currentChain,
        bestChain: topCurrentChain.bestChain,
        wins: topCurrentChain.wins,
        losses: topCurrentChain.losses,
        winRate: topCurrentChain.winRate,
        equippedCosmetics: topCurrentChain.equippedCosmetics || null
      } : null,
      topBestChain: topBestChain ? {
        userId: topBestChain.id,
        username: topBestChain.username,
        image: topBestChain.image,
        bestChain: topBestChain.bestChain,
        currentChain: topBestChain.currentChain,
        wins: topBestChain.wins,
        losses: topBestChain.losses,
        winRate: topBestChain.winRate,
        equippedCosmetics: topBestChain.equippedCosmetics || null
      } : null,
      topWins: topWins ? {
        userId: topWins.id,
        username: topWins.username,
        image: topWins.image,
        wins: topWins.wins,
        losses: topWins.losses,
        winRate: topWins.winRate,
        bestChain: topWins.bestChain,
        currentChain: topWins.currentChain,
        equippedCosmetics: topWins.equippedCosmetics || null
      } : null,
      topWinRate: topWinRate ? {
        userId: topWinRate.id,
        username: topWinRate.username,
        image: topWinRate.image,
        winRate: topWinRate.winRate,
        wins: topWinRate.wins,
        losses: topWinRate.losses,
        totalDecisions: topWinRate.totalDecisions,
        bestChain: topWinRate.bestChain,
        currentChain: topWinRate.currentChain,
        equippedCosmetics: topWinRate.equippedCosmetics || null
      } : null,
    },
    rankings: sorted.map((p, idx) => ({
      rank: idx + 1,
      id: p.id,
      userId: p.id,
      username: p.username,
      name: p.name,
      displayName: p.displayName || p.username,
      image: p.image,
      stats: { wins: p.wins, losses: p.losses, pushes: p.pushes },
      currentChain: p.currentChain,
      bestChain: p.bestChain,
      winRate: p.winRate,
      totalDecisions: p.totalDecisions,
      equippedCosmetics: p.equippedCosmetics || null
    }))
  };

  try {
    await adminDb.collection('monthlyResults').doc(monthKey).set(snapshot);
  } catch (err) {
    console.warn(`Could not cache reconstructed monthlyResults/${monthKey}:`, err);
  }

  return snapshot;
}
