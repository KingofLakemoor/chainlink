import * as firebaseAdmin from '../lib/firebase-admin.js';
import { isTeamMatch } from '../lib/teamUtils.js';

let getAdminDb = () => firebaseAdmin.adminDb;
export function setAdminDbMock(mock: any) { getAdminDb = () => mock; }

export async function gradeLink4Matchups(matchups: any[]) {
  if (!getAdminDb()) {
    console.warn("[Link4Grader] adminDb is not initialized. Skipping grading.");
    return;
  }

  const finalMatchups = matchups.filter(m => m.status === 'STATUS_FINAL' || m.status === 'STATUS_POSTPONED');
  if (finalMatchups.length === 0) return;

  // Evaluate all active link4 segments
  const adminDb = getAdminDb();
  if (!adminDb) return;

  const now = new Date().toISOString();
  // Find all active segments (endTime is in the future) or segments that haven't been marked as payoutComplete
  const segmentsRef = adminDb.collection('link4Segments');
  const activeSegmentsSnap = await segmentsRef.get();
  const activeSegmentsDocs = activeSegmentsSnap.docs.filter(d => !d.data().payoutComplete);

  if (activeSegmentsSnap.empty) {
    return;
  }

  let batch = adminDb.batch();
  let opCount = 0;

  for (const segmentDoc of activeSegmentsDocs) {
    const segmentId = segmentDoc.id;
    const picksSnap = await adminDb.collection('link4Picks').where('segmentId', '==', segmentId).get();

    if (picksSnap.empty) continue;

    for (const pickDoc of picksSnap.docs) {
      const pickData = pickDoc.data();

      let isModified = false;

      // Ensure the picks array exists
      if (!pickData.picks || !Array.isArray(pickData.picks)) continue;

      const newPicks = pickData.picks.map((pick: any) => {
        // Try to find the pick in the currently finalized matchups
        const matchupId = pick.id.replace('pick-', '');
        const finalizedMatchup = finalMatchups.find(m => m.gameId === matchupId || m.id === matchupId);

        if (!finalizedMatchup) return pick; // Not finalized in this batch

        // Determine outcome
        let status = 'PENDING';
        let pickScore = pick.score || 0;
        if (finalizedMatchup.status === 'STATUS_POSTPONED') {
           status = 'PUSH';
        } else {
           let adjustedHomeScore = finalizedMatchup.homeTeam?.score || 0;
           const awayScore = finalizedMatchup.awayTeam?.score || 0;

           if (finalizedMatchup.type === 'SPREAD' && finalizedMatchup.metadata?.spread !== undefined && finalizedMatchup.metadata?.spread !== null) {
               adjustedHomeScore += Number(finalizedMatchup.metadata.spread);
           }

           let won = false;
           if (adjustedHomeScore === awayScore) {
             status = 'PUSH';
           } else {
             const pickedHome = isTeamMatch(pick.name, finalizedMatchup.homeTeam);
             if (pickedHome && adjustedHomeScore > awayScore) won = true;
             if (!pickedHome && awayScore > adjustedHomeScore) won = true;
             status = won ? 'WIN' : 'LOSS';

             const ml = pickedHome ? finalizedMatchup.metadata?.mlHome : finalizedMatchup.metadata?.mlAway;
             if (ml !== undefined && ml !== null) {
                 pickScore = ml;
             }
           }
        }

        if (pick.status !== status || pick.score !== pickScore) {
          isModified = true;
        }

        return { ...pick, status, score: pickScore };
      });

      const hasLoss = newPicks.some((p: any) => p.status === 'LOSS');

      // If a loss occurred, mark remaining pending picks as cancelled
      if (hasLoss) {
        newPicks.forEach((pick: any) => {
           if (!pick.status || pick.status === 'PENDING') {
              pick.status = 'CANCELLED';
              isModified = true;
           }
        });
      } else {
        // Restore any previously cancelled picks back to pending if no loss exists
        newPicks.forEach((pick: any) => {
           if (pick.status === 'CANCELLED') {
              pick.status = 'PENDING';
              isModified = true;
           }
        });
      }

      if (pickData.hasLoss !== hasLoss) {
        isModified = true;
      }

      if (isModified) {
        batch.update(adminDb.collection('link4Picks').doc(pickDoc.id), {
          picks: newPicks,
          hasLoss,
          updatedAt: Date.now()
        });
        opCount++;

        if (opCount >= 500) {
          await batch.commit();
          batch = adminDb.batch();
          opCount = 0;
        }
      }
    }
  }

  if (opCount > 0) {
    await batch.commit();
  }
}

export async function payoutLink4Segment(segmentId: string) {
  const adminDb = getAdminDb();
  if (!adminDb) return;

  await adminDb.runTransaction(async (transaction: any) => {
    const segmentRef = adminDb.collection('link4Segments').doc(segmentId);
    const segmentDoc = await transaction.get(segmentRef);

    if (!segmentDoc.exists) throw new Error("Segment not found");
    if (segmentDoc.data().payoutComplete) throw new Error("Payout already completed for this segment");

    const picksSnap = await transaction.get(adminDb.collection('link4Picks').where('segmentId', '==', segmentId));
    if (picksSnap.empty) {
       transaction.update(segmentRef, { payoutComplete: true, updatedAt: Date.now() });
       return; // no one played
    }

    const segmentCost = segmentDoc.data().cost ?? 10;
    const allPicks = picksSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

    // Check if any active player has a pending game 4
    for (const entry of allPicks) {
      if (entry.hasLoss) continue;
      const rawPicks = Array.isArray(entry.picks) ? entry.picks : (entry.picks ? Object.values(entry.picks) : []);
      if (rawPicks.length >= 4) {
        const game4 = rawPicks[3] as any;
        if (game4 && game4.status === 'PENDING') {
          return; // Hold payout, someone is still actively competing for the win
        }
      }
    }

    const totalPot = allPicks.length * segmentCost;
    const payoutAmount = Math.floor(totalPot * 0.65);

    // Find the winner
    let highestScore = -Infinity;
    let maxWins = -1;
    let winnerId = null;

    for (const entry of allPicks) {
       if (entry.hasLoss) continue; // Eliminated

       let wins = 0;
       let score = 0;
       let stillPending = false;

       const rawPicks = Array.isArray(entry.picks) ? entry.picks : (entry.picks ? Object.values(entry.picks) : []);

       for (const pick of rawPicks as any[]) {
          if (pick.status === 'WIN') {
             wins++;
             if (pick.score !== undefined && pick.score !== null && pick.score !== 0) {
                 score += pick.score;
             } else {
                 const matchupSnaps = await transaction.get(adminDb.collection('matchups').where('gameId', '==', pick.id.replace('pick-', '')).limit(1));
                 if (!matchupSnaps.empty) {
                   const matchup = matchupSnaps.docs[0].data();
                   const pickedHome = isTeamMatch(pick.name, matchup.homeTeam);
                   const ml = pickedHome ? matchup.metadata?.mlHome : matchup.metadata?.mlAway;
                   if (ml !== undefined && ml !== null) {
                      score += ml;
                   }
                 }
             }
          } else if (pick.status === 'PENDING') {
             stillPending = true;
          }
       }

       if (!stillPending && rawPicks.length === 4) {
          if (wins > maxWins) {
             maxWins = wins;
             highestScore = score;
             winnerId = entry.userId;
          } else if (wins === maxWins) {
             if (score > highestScore) {
                 highestScore = score;
                 winnerId = entry.userId;
             }
          }
       }
    }

    if (winnerId) {
       const userRef = adminDb.collection('users').doc(winnerId);
       const userDoc = await transaction.get(userRef);
       if (userDoc.exists) {
          const userData = userDoc.data();
          transaction.update(userRef, { links: (userData.links || 0) + payoutAmount });
          const logRef = adminDb.collection('linkTransactions').doc();
          transaction.set(logRef, {
            userId: winnerId,
            username: userData.username || userData.name || 'Unknown User',
            type: 'LINK4_WIN',
            amount: payoutAmount,
            description: `Won Link4 Segment`,
            createdAt: Date.now()
          });

          const notificationsRef = adminDb.collection('notifications').doc();
          transaction.set(notificationsRef, {
            title: 'Link4 Winner! 🎉',
            body: `You won the Link4 Segment! ${payoutAmount} links have been added to your account.`,
            audience: 'USER',
            targetUserId: winnerId,
            status: 'PENDING',
            scheduledTime: Date.now(),
            createdAt: Date.now()
          });
       }
    }

    transaction.update(segmentRef, { payoutComplete: true, updatedAt: Date.now() });
  });
}

export async function aggregateAndPurgeLink4Segment(segmentId: string, force: boolean = false) {
  const adminDb = getAdminDb();
  if (!adminDb) throw new Error("adminDb is not initialized");

  const segmentRef = adminDb.collection('link4Segments').doc(segmentId);
  const segmentDoc = await segmentRef.get();

  if (!segmentDoc.exists) {
    throw new Error(`Segment ${segmentId} not found`);
  }

  const segmentData = segmentDoc.data() || {};
  if (!segmentData.payoutComplete && !force) {
    throw new Error(`Segment ${segmentId} payout is not complete yet. Cannot purge.`);
  }

  // 1. Fetch picks for this segment
  const picksSnap = await adminDb.collection('link4Picks').where('segmentId', '==', segmentId).get();
  let picksPurged = 0;
  let usersAggregated = 0;

  if (!picksSnap.empty) {
    // 2. Aggregate master user stats for each user entry
    for (const pickDoc of picksSnap.docs) {
      const pickData = pickDoc.data();
      const userId = pickData.userId;
      if (!userId) continue;

      const rawPicks = Array.isArray(pickData.picks)
        ? pickData.picks
        : (pickData.picks ? Object.values(pickData.picks) : []);

      const picksSubmitted = rawPicks.length;
      const picksWon = rawPicks.filter((p: any) => p && p.status === 'WIN').length;

      // Check if user won payout links for this segment from linkTransactions
      let linksWon = 0;
      let segmentWon = false;
      try {
        const txSnap = await adminDb.collection('linkTransactions')
          .where('userId', '==', userId)
          .where('type', '==', 'LINK4_WIN')
          .get();

        for (const txDoc of txSnap.docs) {
          const txData = txDoc.data();
          // Check if transaction corresponds to this segment or timeframe
          if (txData.description && txData.description.includes(segmentId)) {
            linksWon += Number(txData.amount || 0);
            segmentWon = true;
          }
        }
      } catch (e) {
        console.warn(`[Link4Grader] Failed to check linkTransactions for user ${userId}:`, e);
      }

      // Fallback check: if user has 4 wins and no loss, consider as segment win if no transaction check was conclusive
      if (!segmentWon && !pickData.hasLoss && picksWon === 4 && rawPicks.length === 4) {
        segmentWon = true;
      }

      // Update user master document
      const userRef = adminDb.collection('users').doc(userId);
      const userDoc = await userRef.get();
      if (userDoc.exists) {
        const existingStats = userDoc.data()?.link4Stats || {};
        const updatedStats = {
          totalPlayed: (existingStats.totalPlayed || 0) + 1,
          totalWins: (existingStats.totalWins || 0) + (segmentWon ? 1 : 0),
          totalLosses: (existingStats.totalLosses || 0) + (segmentWon ? 0 : 1),
          totalPicksSubmitted: (existingStats.totalPicksSubmitted || 0) + picksSubmitted,
          totalPicksWon: (existingStats.totalPicksWon || 0) + picksWon,
          totalLinksWon: (existingStats.totalLinksWon || 0) + linksWon,
          lastPlayedAt: Math.max(
            existingStats.lastPlayedAt || 0,
            segmentData.endTime ? new Date(segmentData.endTime).getTime() : Date.now()
          )
        };

        await userRef.set({ link4Stats: updatedStats }, { merge: true });
        usersAggregated++;
      }
    }

    // Delete picks in batches
    let batch = adminDb.batch();
    let batchCount = 0;
    for (const pickDoc of picksSnap.docs) {
      batch.delete(pickDoc.ref);
      batchCount++;
      picksPurged++;

      if (batchCount >= 500) {
        await batch.commit();
        batch = adminDb.batch();
        batchCount = 0;
      }
    }
    if (batchCount > 0) {
      await batch.commit();
    }
  }

  // 3. Delete segment matchups
  let matchupsPurged = 0;
  const matchupsSnap = await adminDb.collection('link4Matchups').where('segmentId', '==', segmentId).get();
  if (!matchupsSnap.empty) {
    let batch = adminDb.batch();
    let batchCount = 0;
    for (const matchupDoc of matchupsSnap.docs) {
      batch.delete(matchupDoc.ref);
      batchCount++;
      matchupsPurged++;

      if (batchCount >= 500) {
        await batch.commit();
        batch = adminDb.batch();
        batchCount = 0;
      }
    }
    if (batchCount > 0) {
      await batch.commit();
    }
  }

  // 4. Delete the segment document
  await segmentRef.delete();

  console.log(`[Link4Grader] Purged segment ${segmentId}: ${picksPurged} picks, ${matchupsPurged} matchups, ${usersAggregated} user stats aggregated.`);

  return {
    segmentId,
    picksPurged,
    matchupsPurged,
    usersAggregated
  };
}

export async function purgeCompletedLink4Segments() {
  const adminDb = getAdminDb();
  if (!adminDb) return { purgedSegmentsCount: 0, results: [] };

  const segmentsSnap = await adminDb.collection('link4Segments')
    .where('payoutComplete', '==', true)
    .get();

  if (segmentsSnap.empty) {
    return { purgedSegmentsCount: 0, results: [] };
  }

  const results: any[] = [];
  for (const segmentDoc of segmentsSnap.docs) {
    try {
      const result = await aggregateAndPurgeLink4Segment(segmentDoc.id);
      results.push(result);
    } catch (e: any) {
      console.error(`[Link4Grader] Failed to purge segment ${segmentDoc.id}:`, e);
    }
  }

  return {
    purgedSegmentsCount: results.length,
    results
  };
}

export async function processCompletedLink4Segments() {
  const adminDb = getAdminDb();
  if (!adminDb) return;

  const now = new Date().toISOString();
  const segmentsSnap = await adminDb.collection('link4Segments')
    .where('endTime', '<=', now)
    .get();

  if (segmentsSnap.empty) return;

  const segmentsToPayout = segmentsSnap.docs.filter(d => !d.data().payoutComplete);

  if (segmentsToPayout.length > 0) {
    for (const segmentDoc of segmentsToPayout) {
      try {
        await payoutLink4Segment(segmentDoc.id);
      } catch (e: any) {
        console.error(`[Link4Grader] Error paying out segment ${segmentDoc.id}:`, e);
      }
    }
  }

  // Auto purge segments with completed payouts to prevent record buildup
  try {
    await purgeCompletedLink4Segments();
  } catch (e: any) {
    console.error(`[Link4Grader] Error auto-purging completed segments:`, e);
  }
}
