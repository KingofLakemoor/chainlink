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

  if (pendingPicksSnap.empty) {
    return;
  }

  const homeScore = Number(matchup.homeTeam?.score || 0);
  const awayScore = Number(matchup.awayTeam?.score || 0);
  const lowerScoreWins = matchup.metadata?.lowerScoreWins;
  const isPostponed = matchup.status === 'STATUS_POSTPONED';

  let adjustedHomeScore = homeScore;
  if (matchup.type === 'SPREAD' && matchup.metadata?.spread !== undefined && matchup.metadata?.spread !== null) {
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

  for (const pickDoc of pendingPicksSnap.docs) {
    const pickData = pickDoc.data();

    let pickStatus = 'LOSS';
    let pointsEarned = 0;

    if (isTie) {
      pickStatus = 'PUSH';
      pointsEarned = 0;
    } else if (pickData.pick?.teamId === winnerId) {
      pickStatus = 'WIN';
      pointsEarned = 1; // Assuming 1 point per correct pick
    }

    try {
      await adminDb.runTransaction(async (transaction: any) => {
        const pickRefGet = await transaction.get(pickDoc.ref);
        if (!pickRefGet.exists || pickRefGet.data()?.status !== 'PENDING') {
           console.warn(`[PickemGrader] Pick ${pickDoc.id} is no longer PENDING or does not exist. Skipping.`);
           return;
        }

        transaction.update(pickDoc.ref, {
          status: pickStatus,
          pointsEarned,
          updatedAt: Date.now()
        });
      });

    } catch (err) {
      console.error(`[PickemGrader] Failed to grade pickem pick ${pickDoc.id}:`, err);
    }
  }
}
