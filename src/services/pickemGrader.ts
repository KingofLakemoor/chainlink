import * as firebaseAdmin from '../lib/firebase-admin.js';
import { isTeamMatch } from '../lib/teamUtils.js';

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
  const allPicksSnap = await picksRef
    .where('matchupId', '==', matchup.id)
    .get();

  const homeScore = Number(matchup.homeTeam?.score || 0);
  const awayScore = Number(matchup.awayTeam?.score || 0);
  const lowerScoreWins = matchup.metadata?.lowerScoreWins;
  const isPostponed = matchup.status === 'STATUS_POSTPONED';

  let isMoneyline = matchup.type === 'STANDARD';
  let isYesDay = matchup.campaignName === 'YES Day Walk for Autism 2026' || matchup.campaignId === 'yes_day_2026';

  if (isYesDay) {
    isMoneyline = true;
  } else if (matchup.campaignId) {
    try {
      const campDoc = await adminDb.collection('pickemCampaigns').doc(matchup.campaignId).get();
      if (campDoc.exists) {
        const cData = campDoc.data();
        if (cData?.name === 'YES Day Walk for Autism 2026' || cData?.defaultMatchType === 'STANDARD') {
          isMoneyline = true;
        }
        if (cData?.name === 'YES Day Walk for Autism 2026') {
          isYesDay = true;
        }
      }
    } catch (e) {
      console.warn(`[PickemGrader] Could not fetch campaign ${matchup.campaignId}:`, e);
    }
  }

  let adjustedHomeScore = homeScore;
  if (isMoneyline) {
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
  } else if (matchup.type === 'OVER_UNDER' && (matchup.metadata?.overUnder !== undefined || matchup.metadata?.targetLine !== undefined)) {
    const isSolo = matchup.metadata?.isSoloProp || matchup.metadata?.isSinglePlayerProp;
    const statScore = isSolo ? awayScore : (homeScore + awayScore);
    const overUnderLine = Number(matchup.metadata?.overUnder ?? matchup.metadata?.targetLine ?? 0);

    if (statScore === overUnderLine) {
      isTie = true;
    } else if (statScore > overUnderLine) {
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
      const updateData: any = {
        winnerId: isTie ? 'PUSH' : winnerId,
        status: matchup.status || 'STATUS_FINAL'
      };
      if (matchup.manualWinnerId !== undefined) {
        updateData.manualWinnerId = matchup.manualWinnerId;
      }
      await adminDb.collection('pickemMatchups').doc(matchup.id).update(updateData);
    }
  } catch (err) {
    console.error('Failed to update pickemMatchup winnerId:', err);
  }

  if (allPicksSnap.empty) {
    return;
  }

  const now = Date.now();
  let batch = adminDb.batch();
  let opCount = 0;

  for (const pickDoc of allPicksSnap.docs) {
    const pickData = pickDoc.data();

    let pickStatus = 'LOSS';
    let pointsEarned = 0;

    const rawPick = pickData.pick;
    const pickedTeamId = typeof rawPick === 'string'
      ? rawPick
      : (rawPick?.teamId || rawPick?.id || rawPick?.name || rawPick);

    let isWin = false;
    if (!isTie && winnerId) {
      const isHomeWinner = matchup.homeTeam && (
        winnerId === matchup.homeTeam.id ||
        winnerId === matchup.homeTeam.name ||
        winnerId === 'home' ||
        isTeamMatch(winnerId, matchup.homeTeam)
      );
      const isAwayWinner = matchup.awayTeam && (
        winnerId === matchup.awayTeam.id ||
        winnerId === matchup.awayTeam.name ||
        winnerId === 'away' ||
        isTeamMatch(winnerId, matchup.awayTeam)
      );

      if (isHomeWinner) {
        if (matchup.homeTeam && isTeamMatch(pickedTeamId, matchup.homeTeam)) {
          isWin = true;
        } else if (pickedTeamId === winnerId || pickedTeamId === 'home' || pickedTeamId === matchup.homeTeam?.id) {
          isWin = true;
        }
      } else if (isAwayWinner) {
        if (matchup.awayTeam && isTeamMatch(pickedTeamId, matchup.awayTeam)) {
          isWin = true;
        } else if (pickedTeamId === winnerId || pickedTeamId === 'away' || pickedTeamId === matchup.awayTeam?.id) {
          isWin = true;
        }
      } else {
        // Fallback (e.g., OVER / UNDER or direct string match)
        if (pickedTeamId === winnerId) {
          isWin = true;
        }
      }
    }

    // SPECIAL RULE: Saints vs Lions for Week 1 in YES Day campaign explicitly grades Saints pickers as a LOSS (and Lions pickers as a WIN)
    const saintsDummyObj = { id: 'new_orleans_saints', name: 'New Orleans Saints', shortName: 'Saints', abbreviation: 'NO' };
    const lionsDummyObj = { id: 'detroit_lions', name: 'Detroit Lions', shortName: 'Lions', abbreviation: 'DET' };

    const isSaintsInMatchup = (matchup.homeTeam && isTeamMatch(matchup.homeTeam.id || matchup.homeTeam.name, saintsDummyObj)) ||
                              (matchup.awayTeam && isTeamMatch(matchup.awayTeam.id || matchup.awayTeam.name, saintsDummyObj));
    const isLionsInMatchup = (matchup.homeTeam && isTeamMatch(matchup.homeTeam.id || matchup.homeTeam.name, lionsDummyObj)) ||
                             (matchup.awayTeam && isTeamMatch(matchup.awayTeam.id || matchup.awayTeam.name, lionsDummyObj));
    const isSaintsVsLions = isSaintsInMatchup && isLionsInMatchup;

    const matchupWeekNum = Number(matchup.week || matchup.weekNumber || 0);
    const pickWeekNum = Number(pickData.week || 0);
    const isWeek1 = matchupWeekNum === 1 || pickWeekNum === 1 || (!matchupWeekNum && !pickWeekNum);

    const isSaintsPick = pickedTeamId && isTeamMatch(pickedTeamId, saintsDummyObj);
    const isLionsPick = pickedTeamId && isTeamMatch(pickedTeamId, lionsDummyObj);

    if (isYesDay && isWeek1 && isSaintsVsLions) {
      if (isSaintsPick) {
        isWin = false;
      } else if (isLionsPick) {
        isWin = true;
      }
    } else if (isYesDay && isSaintsPick) {
      isWin = false;
    }

    if (isTie) {
      pickStatus = 'PUSH';
      pointsEarned = 0;
    } else if (isWin) {
      pickStatus = 'WIN';
      pointsEarned = pickData.confidence || 1; // Handle confidence points
    } else {
      pickStatus = 'LOSS';
      pointsEarned = 0;
    }

    if (pickData.status === pickStatus && pickData.pointsEarned === pointsEarned) {
      continue;
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

    const isYesDay = campaignData.isCharity || campaignData.name === 'YES Day Walk for Autism 2026' || campaignId === 'charity' || campaignId === 'yes_day_2026';
    const targetCampaignIds = new Set<string>([campaignId]);
    if (isYesDay) {
      targetCampaignIds.add('yes_day_2026');
      targetCampaignIds.add('charity');
      targetCampaignIds.add('YES Day Walk for Autism 2026');
      if (campaignData.name) targetCampaignIds.add(campaignData.name);
    }

    const participantPoints: Record<string, { uid: string, points: number }> = {};

    for (const cid of targetCampaignIds) {
      const participantsSnap = await transaction.get(adminDb.collection('pickemParticipants').where('campaignId', '==', cid));
      participantsSnap.docs.forEach((d: any) => {
        const uid = d.data().participantId || d.data().userId || d.id.split('_')[1];
        if (uid) {
          if (!participantPoints[uid]) {
            participantPoints[uid] = { uid, points: 0 };
          }
        }
      });
    }

    const processedPickIds = new Set<string>();
    for (const cid of targetCampaignIds) {
      const picksSnap = await transaction.get(adminDb.collection('pickemPicks').where('campaignId', '==', cid));
      picksSnap.docs.forEach((d: any) => {
        if (processedPickIds.has(d.id)) return;
        processedPickIds.add(d.id);

        const data = d.data();
        const pId = data.participantId || data.userId;
        if (pId) {
          if (!participantPoints[pId]) {
            participantPoints[pId] = { uid: pId, points: 0 };
          }
          if (data.status === 'WIN') {
            participantPoints[pId].points += data.pointsEarned || 1;
          }
        }
      });
    }

    const totalEntries = Object.keys(participantPoints).length;
    if (totalEntries === 0) {
      transaction.update(campaignRef, { payoutComplete: true, updatedAt: Date.now() });
      return;
    }

    const totalPot = totalEntries * entryFee;

    if (totalPot <= 0 && !isYesDay) {
      transaction.update(campaignRef, { payoutComplete: true, updatedAt: Date.now() });
      return;
    }

    // Payout percentages: 65% total entries pot (1st: 45%, 2nd: 15%, 3rd: 5%)
    const firstPayout = Math.floor(totalPot * 0.45);
    const secondPayout = Math.floor(totalPot * 0.15);
    const thirdPayout = Math.floor(totalPot * 0.05);

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
