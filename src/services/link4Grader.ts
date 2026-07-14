import * as firebaseAdmin from '../lib/firebase-admin.js';

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
      if (pickData.hasLoss) continue; // Already eliminated

      let isModified = false;
      let hasNewLoss = false;

      // Ensure the picks array exists
      if (!pickData.picks || !Array.isArray(pickData.picks)) continue;

      const newPicks = pickData.picks.map((pick: any) => {
        // Skip if this pick is already graded
        if (pick.status && pick.status !== 'PENDING') return pick;

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
           const homeScore = finalizedMatchup.homeTeam?.score || 0;
           const awayScore = finalizedMatchup.awayTeam?.score || 0;
           let won = false;
           if (homeScore === awayScore) {
             status = 'PUSH';
           } else {
             const pickedHome = pick.name === finalizedMatchup.homeTeam?.name;
             if (pickedHome && homeScore > awayScore) won = true;
             if (!pickedHome && awayScore > homeScore) won = true;
             status = won ? 'WIN' : 'LOSS';

             if (pickScore === 0) {
                 const ml = pickedHome ? finalizedMatchup.metadata?.mlHome : finalizedMatchup.metadata?.mlAway;
                 if (ml !== undefined && ml !== null) {
                     pickScore = ml;
                 }
             }
           }
        }

        if (status === 'LOSS') {
           hasNewLoss = true;
        }

        isModified = true;
        return { ...pick, status, score: pickScore };
      });

      if (isModified) {
        // If a loss occurred, mark remaining pending picks as cancelled
        if (hasNewLoss) {
          newPicks.forEach((pick: any) => {
             if (!pick.status || pick.status === 'PENDING') {
                pick.status = 'CANCELLED';
             }
          });
        }

        batch.update(adminDb.collection('link4Picks').doc(pickDoc.id), {
          picks: newPicks,
          hasLoss: pickData.hasLoss || hasNewLoss,
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
    const payoutAmount = Math.floor(totalPot * 0.60);

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
                   const pickedHome = pick.name === matchup.homeTeam?.name;
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

export async function processCompletedLink4Segments() {
  const adminDb = getAdminDb();
  if (!adminDb) return;

  const now = new Date().toISOString();
  const segmentsSnap = await adminDb.collection('link4Segments')
    .where('endTime', '<=', now)
    .get();

  if (segmentsSnap.empty) return;

  const segmentsToPayout = segmentsSnap.docs.filter(d => !d.data().payoutComplete);

  if (segmentsToPayout.length === 0) return;

  for (const segmentDoc of segmentsToPayout) {
    try {
      await payoutLink4Segment(segmentDoc.id);
    } catch (e: any) {
      console.error(`[Link4Grader] Error paying out segment ${segmentDoc.id}:`, e);
    }
  }
}
