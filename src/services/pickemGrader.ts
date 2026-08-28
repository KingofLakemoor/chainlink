import * as firebaseAdmin from '../lib/firebase-admin.js';

let getAdminDb = () => firebaseAdmin.adminDb;
export function setAdminDbMock(mock: any) { getAdminDb = () => mock; }

export async function gradePickemMatchups(pickemMatchups: any[]) {
  if (!getAdminDb()) {
    console.warn("[PickemGrader] adminDb is not initialized. Skipping grading.");
    return;
  }

  const finalMatchups = pickemMatchups.filter(m => m.status === 'STATUS_FINAL' || m.status === 'STATUS_POSTPONED');
  if (finalMatchups.length === 0) return;

  for (const matchup of finalMatchups) {
    try {
      await gradeSinglePickemMatchup(matchup);
    } catch (e: any) {
      console.error(`[PickemGrader] Error grading pickem matchup ${matchup.id}:`, e);
    }
  }
}

export async function gradeSinglePickemMatchup(matchup: any) {
  const adminDb = getAdminDb();
  if (!adminDb) return;

  const picksRef = adminDb.collection('pickemPicks');
  const pendingPicksSnap = await picksRef
    .where('matchupId', '==', matchup.id)
    .where('status', '==', 'PENDING')
    .get();

  const homeScore = Number(matchup.homeTeam?.score || 0);
  const awayScore = Number(matchup.awayTeam?.score || 0);
  const lowerScoreWins = matchup.metadata?.lowerScoreWins;
  const isPostponed = matchup.status === 'STATUS_POSTPONED';

  let adjustedHomeScore = homeScore;
  if (matchup.campaignName === 'YES Day Walk for Autism 2026') {
    adjustedHomeScore = homeScore;
  } else if (matchup.type === 'SPREAD' && matchup.metadata?.spread !== undefined && matchup.metadata?.spread !== null) {
    adjustedHomeScore += Number(matchup.metadata.spread);
  }

  let winnerId: string | null = null;
  let isTie = false;

  if (matchup.manualWinnerId !== undefined) {
    if (matchup.manualWinnerId === 'PUSH') {
      isTie = true;
    } else {
      winnerId = matchup.manualWinnerId;
    }
  } else if (isPostponed) {
    isTie = true; // Treats postponed as a push
  } else if (matchup.type === 'OVER_UNDER' && matchup.metadata?.overUnder !== undefined && matchup.metadata?.overUnder !== null) {
    const combinedScore = homeScore + awayScore;
    const overUnderLine = Number(matchup.metadata.overUnder);

    if (combinedScore === overUnderLine) {
      isTie = true;
    } else if (combinedScore > overUnderLine) {
      winnerId = 'OVER';
    } else {
      winnerId = 'UNDER';
    }
  } else if (matchup.type === 'SOCCER_SCORE') {
    const awayScoreType = matchup.metadata?.awayScoreType || 'WIN_BY';
    const homeScoreType = matchup.metadata?.homeScoreType || 'WIN_DRAW_LOSE';
    const awayScoreValue = Number(matchup.metadata?.awayScoreValue || 0);
    const homeScoreValue = Number(matchup.metadata?.homeScoreValue || 0);

    let awayWins = false;
    if (awayScoreType === 'WIN_BY') {
        awayWins = (awayScore - homeScore) >= awayScoreValue;
    } else {
        awayWins = (awayScore - homeScore) >= -awayScoreValue;
    }

    let homeWins = false;
    if (homeScoreType === 'WIN_BY') {
        homeWins = (homeScore - awayScore) >= homeScoreValue;
    } else {
        homeWins = (homeScore - awayScore) >= -homeScoreValue;
    }

    if (awayWins && !homeWins) {
        winnerId = matchup.awayTeam?.id;
    } else if (homeWins && !awayWins) {
        winnerId = matchup.homeTeam?.id;
    } else {
        isTie = true;
    }
  } else if (adjustedHomeScore === awayScore) {
    isTie = true;
  } else if (lowerScoreWins) {
    winnerId = adjustedHomeScore < awayScore ? matchup.homeTeam.id : matchup.awayTeam.id;
  } else {
    winnerId = adjustedHomeScore > awayScore ? matchup.homeTeam.id : matchup.awayTeam.id;
  }

  try {
    if (matchup.id) {
      await adminDb.collection('pickemMatchups').doc(matchup.id).update({ winnerId: isTie ? 'PUSH' : winnerId, status: matchup.status || 'STATUS_FINAL' });
    }
  } catch (err) {
    console.error('Failed to update pickemMatchup winnerId:', err);
  }

  if (pendingPicksSnap.empty) {
    return;
  }

  const now = Date.now();
  let batch = adminDb.batch();
  let opCount = 0;

  for (const pickDoc of pendingPicksSnap.docs) {
    const pickData = pickDoc.data();
    if (pickData.status !== 'PENDING') continue;

    let pickStatus = 'LOSS';
    let pointsEarned = 0;

    if (isTie) {
      pickStatus = 'PUSH';
      pointsEarned = 0;
    } else if (pickData.pick?.teamId === winnerId) {
      pickStatus = 'WIN';
      pointsEarned = pickData.confidence || 1; // Handle confidence points
    }

    batch.update(pickDoc.ref, {
      status: pickStatus,
      pointsEarned,
      updatedAt: now
    });

    opCount++;
    if (opCount >= 450) {
      await batch.commit();
      batch = adminDb.batch();
      opCount = 0;
    }
  }

  if (opCount > 0) {
    await batch.commit();
  }
}

export async function payoutPickemCampaign(campaignId: string) {
  const adminDb = getAdminDb();
  if (!adminDb) return;

  await adminDb.runTransaction(async (transaction: any) => {
    const campaignRef = adminDb.collection('pickemCampaigns').doc(campaignId);
    const campaignDoc = await transaction.get(campaignRef);

    if (!campaignDoc.exists) throw new Error("Campaign not found");
    if (campaignDoc.data().payoutComplete) throw new Error("Payout already completed for this campaign");

    const campaignData = campaignDoc.data();
    const entryFee = campaignData.entryFee || 0;

    const participantsSnap = await transaction.get(adminDb.collection('pickemParticipants').where('campaignId', '==', campaignId));
    if (participantsSnap.empty) {
      transaction.update(campaignRef, { payoutComplete: true, updatedAt: Date.now() });
      return;
    }

    const totalEntries = participantsSnap.size;
    const totalPot = totalEntries * entryFee;

    if (totalPot <= 0) {
      transaction.update(campaignRef, { payoutComplete: true, updatedAt: Date.now() });
      return;
    }

    // Payout percentages: 65% total entries pot (1st: 45%, 2nd: 15%, 3rd: 5%)
    const firstPayout = Math.floor(totalPot * 0.45);
    const secondPayout = Math.floor(totalPot * 0.15);
    const thirdPayout = Math.floor(totalPot * 0.05);

    // Calculate points for each participant
    const picksSnap = await transaction.get(adminDb.collection('pickemPicks').where('campaignId', '==', campaignId));

    const participantPoints: Record<string, { uid: string, points: number }> = {};
    participantsSnap.docs.forEach((d: any) => {
      const uid = d.data().participantId;
      if (uid) {
        participantPoints[uid] = { uid, points: 0 };
      }
    });

    picksSnap.docs.forEach((d: any) => {
      const data = d.data();
      const pId = data.participantId;
      if (participantPoints[pId]) {
        if (data.status === 'WIN') {
          participantPoints[pId].points += data.pointsEarned || 1;
        }
      }
    });

    const leaderboard = Object.values(participantPoints).sort((a, b) => b.points - a.points);

    const winners = [
      { rank: '1st', placeName: '1st Place', uid: leaderboard[0]?.uid, amount: firstPayout },
      { rank: '2nd', placeName: '2nd Place', uid: leaderboard[1]?.uid, amount: secondPayout },
      { rank: '3rd', placeName: '3rd Place', uid: leaderboard[2]?.uid, amount: thirdPayout },
    ];

    for (const w of winners) {
      if (w.uid && w.amount > 0) {
        const userRef = adminDb.collection('users').doc(w.uid);
        const userDoc = await transaction.get(userRef);
        if (userDoc.exists) {
          const userData = userDoc.data();
          transaction.update(userRef, { links: (userData.links || 0) + w.amount });

          const logRef = adminDb.collection('linkTransactions').doc();
          transaction.set(logRef, {
            userId: w.uid,
            username: userData.username || userData.name || 'Unknown User',
            type: 'PICKEM_WIN',
            amount: w.amount,
            description: `Won ${w.placeName} in Pick 'Em Campaign: ${campaignData.name || campaignId}`,
            createdAt: Date.now()
          });

          const notificationsRef = adminDb.collection('notifications').doc();
          transaction.set(notificationsRef, {
            title: `Pick 'Em Winner! 🎉`,
            body: `You finished ${w.placeName} in ${campaignData.name || 'Pick Em'}! ${w.amount} links have been added to your account.`,
            audience: 'USER',
            targetUserId: w.uid,
            status: 'PENDING',
            scheduledTime: Date.now(),
            createdAt: Date.now()
          });
        }
      }
    }

    transaction.update(campaignRef, { payoutComplete: true, updatedAt: Date.now() });
  });
}
