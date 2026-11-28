import * as firebaseAdmin from '../lib/firebase-admin.js';
import { isTeamMatch } from '../lib/teamUtils.js';
import { generateAndSavePickemLeaderboard, getCampaignAliases, getStaticPickemLeaderboard, setAdminDbMock as setLeaderboardAdminDbMock } from './pickemLeaderboardService.js';
import { extractOverUnderLine } from '../utils/matchupUtils.js';

let getAdminDb = () => firebaseAdmin.adminDb;

export function setAdminDbMock(mock: any) {
  getAdminDb = () => mock;
  setLeaderboardAdminDbMock(mock);
}

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

  // Update static leaderboard document for all graded campaigns
  const campaignIdsToUpdate = new Set<string>();
  finalMatchups.forEach(m => {
    if (m.campaignId) campaignIdsToUpdate.add(m.campaignId);
    if (m.campaignName) campaignIdsToUpdate.add(m.campaignName);
  });
  for (const cid of campaignIdsToUpdate) {
    try {
      await generateAndSavePickemLeaderboard(cid);
    } catch (err) {
      console.error(`[PickemGrader] Failed to update static leaderboard for ${cid}:`, err);
    }
  }
}

export async function gradeSinglePickemMatchup(matchup: any) {
  const adminDb = getAdminDb();
  if (!adminDb) return;

  const targetIds = new Set<string>();
  if (matchup.id) targetIds.add(String(matchup.id));
  if (matchup.gameId) targetIds.add(String(matchup.gameId));

  const weekNum = matchup.week || matchup.weekNumber || 1;
  const gameId = matchup.gameId || (matchup.id ? String(matchup.id).split('_').pop() : '');

  const matchupIdStr = String(matchup.id || '').toLowerCase();
  const campaignIdStr = String(matchup.campaignId || '').toLowerCase();
  const campaignNameStr = typeof matchup.campaignName === 'string' ? matchup.campaignName.toLowerCase() : '';
  const metadataCampaignIdStr = String(matchup.metadata?.campaignId || '').toLowerCase();

  let isYesDay = matchup.isCharity ||
                 matchup.metadata?.isCharity ||
                 matchup.campaignName === 'YES Day Walk for Autism 2026' ||
                 matchup.campaignId === 'yes_day_2026' ||
                 matchup.campaignId === 'charity' ||
                 matchup.campaignId === 'aUqhDhT3vKWfkPgSAVzf' ||
                 campaignIdStr === 'yes_day_2026' ||
                 campaignIdStr === 'charity' ||
                 campaignIdStr === 'auqhdht3vkwfkpgsavzf' ||
                 metadataCampaignIdStr === 'yes_day_2026' ||
                 metadataCampaignIdStr === 'charity' ||
                 metadataCampaignIdStr === 'auqhdht3vkwfkpgsavzf' ||
                 campaignNameStr.includes('yes day') ||
                 matchupIdStr.startsWith('yes_day') ||
                 matchupIdStr.startsWith('charity') ||
                 matchupIdStr.includes('auqhdht3vkwfkpgsavzf');

  let campaignData: any = null;
  if (matchup.campaignId) {
    try {
      const campDoc = await adminDb.collection('pickemCampaigns').doc(matchup.campaignId).get();
      if (campDoc.exists) {
        campaignData = campDoc.data();
        const fetchedName = typeof campaignData?.name === 'string' ? campaignData.name.toLowerCase() : '';
        if (
          campaignData?.name === 'YES Day Walk for Autism 2026' ||
          campaignData?.isCharity ||
          fetchedName.includes('yes day') ||
          fetchedName.includes('walk for autism')
        ) {
          isYesDay = true;
        }
      }
    } catch (e) {
      console.warn(`[PickemGrader] Could not fetch campaign ${matchup.campaignId}:`, e);
    }
  }

  if (isYesDay) {
    const charityAliases = ['yes_day_2026', 'charity', 'YES Day Walk for Autism 2026', 'aUqhDhT3vKWfkPgSAVzf', matchup.campaignId, matchup.campaignName].filter(Boolean);
    for (const cid of charityAliases) {
      if (gameId) {
        targetIds.add(`${cid}_${weekNum}_${gameId}`);
        targetIds.add(`${cid}__${gameId}`);
        targetIds.add(`${cid}_${gameId}`);
      }
      if (matchup.id) {
        targetIds.add(`${cid}_${matchup.id}`);
      }
    }
  }

  const picksRef = adminDb.collection('pickemPicks');
  const targetIdList = Array.from(targetIds).filter(Boolean);

  const pickDocMap = new Map<string, any>();
  for (let i = 0; i < targetIdList.length; i += 30) {
    const chunk = targetIdList.slice(i, i + 30);
    try {
      const snap = await picksRef.where('matchupId', 'in', chunk).get();
      snap.docs.forEach((d: any) => pickDocMap.set(d.id, d));
    } catch (e) {
      console.warn('[PickemGrader] Error querying picks for targetIds chunk:', e);
    }
  }

  const allPicksDocs = Array.from(pickDocMap.values());

  const homeScore = Number(matchup.homeTeam?.score || 0);
  const awayScore = Number(matchup.awayTeam?.score || 0);
  const lowerScoreWins = matchup.metadata?.lowerScoreWins;
  const isPostponed = matchup.status === 'STATUS_POSTPONED';

  let isMoneyline = matchup.type === 'STANDARD';

  if (isYesDay) {
    isMoneyline = true;
  } else if (
    campaignData?.name === 'YES Day Walk for Autism 2026' ||
    campaignData?.isCharity ||
    (campaignData?.defaultMatchType === 'STANDARD' && !matchup.manualTypeOverride && !matchup.isManualOverride)
  ) {
    isMoneyline = true;
  }

  let adjustedHomeScore = homeScore;
  if (isYesDay || isMoneyline) {
    // YES Day campaigns and standard matchups strictly grade as moneyline straight-up winners
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
  } else if (matchup.type === 'OVER_UNDER') {
    const isSolo = matchup.metadata?.isSoloProp || matchup.metadata?.isSinglePlayerProp;
    const statScore = isSolo ? awayScore : (homeScore + awayScore);
    const parsedLine = extractOverUnderLine(matchup);
    const overUnderLine = parsedLine !== null ? parsedLine : Number(matchup.metadata?.overUnder ?? matchup.metadata?.targetLine ?? 0);

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
        status: matchup.status || 'STATUS_FINAL',
        isGraded: true
      };
      if (isYesDay) {
        if (matchup.type !== 'STANDARD') {
          updateData.type = 'STANDARD';
          updateData.manualTypeOverride = false;
        }
        if (typeof matchup.title === 'string' && matchup.title.endsWith(' - ATS')) {
          updateData.title = matchup.title.replace(/ - ATS$/, '');
        }
      }
      if (matchup.manualWinnerId !== undefined) {
        updateData.manualWinnerId = matchup.manualWinnerId;
      }
      await adminDb.collection('pickemMatchups').doc(matchup.id).update(updateData);
    }
  } catch (err) {
    console.error('Failed to update pickemMatchup winnerId:', err);
  }

  if (allPicksDocs.length === 0) {
    return;
  }

  const now = Date.now();
  let batch = adminDb.batch();
  let opCount = 0;

  for (const pickDoc of allPicksDocs) {
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

export async function payoutPickemCampaign(campaignId: string, options?: { force?: boolean }) {
  const adminDb = getAdminDb();
  if (!adminDb) return;

  // 1. Resolve canonical ID, aliases, and campaign document
  const { canonicalId, aliases, campaignData: initialCampData } = await getCampaignAliases(campaignId);

  // 2. Fetch campaign metadata
  const campaignRef = adminDb.collection('pickemCampaigns').doc(canonicalId);
  const campaignSnap = await campaignRef.get();
  if (!campaignSnap.exists) throw new Error("Campaign not found");

  const campaignData = campaignSnap.data() || initialCampData || {};
  const force = options?.force === true;

  if (campaignData.payoutComplete && !force) {
    throw new Error("Payout already completed for this campaign");
  }

  // 3. Resolve all aliases
  const targetCampaignIds = new Set<string>(aliases);
  targetCampaignIds.add(canonicalId);
  targetCampaignIds.add(campaignId);
  if (campaignData.name) targetCampaignIds.add(campaignData.name);

  const isYesDay = !!(
    campaignData.isCharity ||
    campaignData.name === 'YES Day Walk for Autism 2026' ||
    canonicalId === 'charity' ||
    canonicalId === 'yes_day_2026' ||
    canonicalId === 'aUqhDhT3vKWfkPgSAVzf' ||
    (typeof campaignData.name === 'string' && campaignData.name.toLowerCase().includes('yes day'))
  );

  if (isYesDay) {
    targetCampaignIds.add('yes_day_2026');
    targetCampaignIds.add('charity');
    targetCampaignIds.add('aUqhDhT3vKWfkPgSAVzf');
    targetCampaignIds.add('YES Day Walk for Autism 2026');
  }

  // 4. Gather participant scores from static leaderboard first (with tiebreakers & verified scores),
  // with fallback to raw pickemPicks queries across all aliases.
  let sortedParticipants: Array<{ uid: string; points: number; rank?: number }> = [];

  try {
    const leaderboardDoc = await getStaticPickemLeaderboard(canonicalId);
    if (leaderboardDoc && Array.isArray(leaderboardDoc.season) && leaderboardDoc.season.length > 0) {
      sortedParticipants = leaderboardDoc.season.map((p: any) => ({
        uid: p.uid || p.id,
        points: Number(p.points || 0),
        rank: p.rank
      }));
    }
  } catch (err) {
    console.warn(`[PickemGrader] Could not read static leaderboard for payout of ${canonicalId}, falling back to raw picks query:`, err);
  }

  if (sortedParticipants.length === 0) {
    const participantPoints: Record<string, { uid: string; points: number }> = {};

    for (const cid of targetCampaignIds) {
      const participantsSnap = await adminDb.collection('pickemParticipants').where('campaignId', '==', cid).get().catch(() => ({ docs: [] }));
      participantsSnap.docs.forEach((d: any) => {
        const uid = d.data().participantId || d.data().userId || d.id.split('_')[1];
        if (uid && !participantPoints[uid]) {
          participantPoints[uid] = { uid, points: 0 };
        }
      });
    }

    const processedPickIds = new Set<string>();
    for (const cid of targetCampaignIds) {
      const picksSnap = await adminDb.collection('pickemPicks').where('campaignId', '==', cid).get().catch(() => ({ docs: [] }));
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

    sortedParticipants = Object.values(participantPoints).sort((a, b) => b.points - a.points);
  }

  const totalEntries = sortedParticipants.length;
  if (totalEntries === 0) {
    await campaignRef.update({ payoutComplete: true, updatedAt: Date.now() });
    return;
  }

  // 5. Calculate total pot & prize pool
  // Check entryFee * totalEntries, or explicit custom pot fields configured on campaign
  const entryFee = Number(campaignData.entryFee) || 0;
  const explicitPot = Number(campaignData.prizePot ?? campaignData.prizePool ?? campaignData.fixedPrizePot ?? campaignData.guaranteedPot ?? 0);
  const entryPot = totalEntries * entryFee;
  const totalPot = explicitPot > 0 ? explicitPot : entryPot;

  const prizePotPercent = campaignData.prizePotPercent !== undefined ? Number(campaignData.prizePotPercent) : 65;
  const distributablePot = explicitPot > 0 ? explicitPot : Math.floor(totalPot * (prizePotPercent / 100));

  // Determine if exclusive champion cosmetic / banner should be awarded
  const isTurkeyCampaign = (typeof campaignData.name === 'string' && (campaignData.name.toLowerCase().includes('turkey') || campaignData.name.toLowerCase().includes('gobbler'))) ||
                           canonicalId.toLowerCase().includes('turkey') ||
                           canonicalId.toLowerCase().includes('gobbler') ||
                           campaignData.awardBannerId === 'banner_turkey_gobbler';

  const bannerToAward = campaignData.awardCosmeticId || campaignData.awardBannerId || (isTurkeyCampaign ? 'banner_turkey_gobbler' : null);
  const cosmeticTitle = campaignData.awardCosmeticName || (isTurkeyCampaign ? 'The Turkey Day Gobbler' : 'Exclusive Champion Cosmetic');

  // If no pot is distributable and no cosmetic to award, mark complete
  if (distributablePot <= 0 && !bannerToAward && !isYesDay) {
    await campaignRef.update({ payoutComplete: true, updatedAt: Date.now() });
    return;
  }

  // 6. Calculate tier distributions handling ties
  const split = campaignData.payoutSplit || { first: 70, second: 20, third: 10 };
  const firstPot = Math.floor(distributablePot * ((split.first ?? 70) / 100));
  const secondPot = Math.floor(distributablePot * ((split.second ?? 20) / 100));
  const thirdPot = Math.floor(distributablePot * ((split.third ?? 10) / 100));

  const uniqueScores = Array.from(new Set(sortedParticipants.map(s => s.points))).sort((a, b) => b - a);
  const tier1 = sortedParticipants.filter(s => s.points === uniqueScores[0]);
  const tier2 = uniqueScores.length > 1 ? sortedParticipants.filter(s => s.points === uniqueScores[1]) : [];
  const tier3 = uniqueScores.length > 2 ? sortedParticipants.filter(s => s.points === uniqueScores[2]) : [];

  const payoutsToDistribute: Array<{ uid: string; amount: number; rank: '1st' | '2nd' | '3rd'; placeName: string }> = [];

  if (tier1.length >= 3) {
    const potForTier1 = firstPot + secondPot + thirdPot;
    const share = Math.floor(potForTier1 / tier1.length);
    tier1.forEach(s => payoutsToDistribute.push({ uid: s.uid, amount: share, rank: '1st', placeName: '1st Place (Tied)' }));
  } else if (tier1.length === 2) {
    const potForTier1 = firstPot + secondPot;
    const share = Math.floor(potForTier1 / 2);
    tier1.forEach(s => payoutsToDistribute.push({ uid: s.uid, amount: share, rank: '1st', placeName: '1st Place (Tied)' }));
    if (tier2.length > 0 && thirdPot > 0) {
      const share3 = Math.floor(thirdPot / tier2.length);
      tier2.forEach(s => payoutsToDistribute.push({ uid: s.uid, amount: share3, rank: '3rd', placeName: tier2.length > 1 ? '3rd Place (Tied)' : '3rd Place' }));
    }
  } else if (tier1.length === 1) {
    payoutsToDistribute.push({ uid: tier1[0].uid, amount: firstPot, rank: '1st', placeName: '1st Place' });
    if (tier2.length >= 2) {
      const potForTier2 = secondPot + thirdPot;
      const share2 = Math.floor(potForTier2 / tier2.length);
      tier2.forEach(s => payoutsToDistribute.push({ uid: s.uid, amount: share2, rank: '2nd', placeName: '2nd Place (Tied)' }));
    } else if (tier2.length === 1) {
      payoutsToDistribute.push({ uid: tier2[0].uid, amount: secondPot, rank: '2nd', placeName: '2nd Place' });
      if (tier3.length > 0 && thirdPot > 0) {
        const share3 = Math.floor(thirdPot / tier3.length);
        tier3.forEach(s => payoutsToDistribute.push({ uid: s.uid, amount: share3, rank: '3rd', placeName: tier3.length > 1 ? '3rd Place (Tied)' : '3rd Place' }));
      }
    }
  }

  // 7. Atomic transaction with READS FIRST then WRITES
  await adminDb.runTransaction(async (transaction: any) => {
    const freshCampDoc = await transaction.get(campaignRef);
    if (!freshCampDoc.exists) throw new Error("Campaign not found");
    if (freshCampDoc.data().payoutComplete && !force) {
      throw new Error("Payout already completed for this campaign");
    }

    // 1. ALL READS FIRST
    const userReadDocs = await Promise.all(
      payoutsToDistribute.map(async (item) => {
        const uRef = adminDb.collection('users').doc(item.uid);
        const uDoc = await transaction.get(uRef);
        return { ref: uRef, doc: uDoc, item };
      })
    );

    // 2. ALL WRITES AFTER READS
    const now = Date.now();
    for (const { ref: userRef, doc: userDoc, item } of userReadDocs) {
      if (!userDoc.exists) continue;
      const userData = userDoc.data();
      const currentLinks = userData.links || 0;
      const updatePayload: any = { links: currentLinks + item.amount };

      // Award exclusive champion cosmetic / banner for 1st place winners
      if (item.rank === '1st' && bannerToAward) {
        const currentInventory = userData.inventory || [];
        if (!currentInventory.includes(bannerToAward)) {
          updatePayload.inventory = [...currentInventory, bannerToAward];
        }
      }

      transaction.update(userRef, updatePayload);

      if (item.amount > 0) {
        const logRef = adminDb.collection('linkTransactions').doc();
        transaction.set(logRef, {
          userId: item.uid,
          username: userData.username || userData.name || 'Unknown User',
          type: 'PICKEM_WIN',
          amount: item.amount,
          description: `Won ${item.placeName} in Pick 'Em Campaign: ${campaignData.name || canonicalId}`,
          createdAt: now
        });
      }

      const bannerAwardMsg = (item.rank === '1st' && bannerToAward)
        ? ` You have also been awarded the exclusive "${cosmeticTitle}" cosmetic!`
        : '';
      const amountMsg = item.amount > 0 ? ` ${item.amount} links have been added to your account.` : '';

      const notificationsRef = adminDb.collection('notifications').doc();
      transaction.set(notificationsRef, {
        title: `Pick 'Em Winner! 🎉`,
        body: `You finished ${item.placeName} in ${campaignData.name || 'Pick Em'}!${amountMsg}${bannerAwardMsg}`,
        audience: 'USER',
        targetUserId: item.uid,
        status: 'PENDING',
        scheduledTime: now,
        createdAt: now
      });
    }

    transaction.update(campaignRef, { payoutComplete: true, updatedAt: now });
  });
}

export async function finalizePickemCampaign(campaignId: string, options?: { retentionDays?: number; distributePayouts?: boolean; forcePayout?: boolean }) {
  const adminDb = getAdminDb();
  if (!adminDb) return;

  const retentionDays = (options?.retentionDays !== undefined && options.retentionDays >= 0)
    ? options.retentionDays
    : 3;
  const shouldDistributePayouts = options?.distributePayouts !== false;
  const forcePayout = options?.forcePayout === true;

  // 1. Grade any remaining matchups and refresh the leaderboard
  try {
    await generateAndSavePickemLeaderboard(campaignId);
  } catch (err) {
    console.warn(`[PickemGrader] Pre-finalization leaderboard generation error:`, err);
  }

  // 2. Distribute payouts if requested
  let payoutExecuted = false;
  let payoutError: string | null = null;
  if (shouldDistributePayouts) {
    try {
      await payoutPickemCampaign(campaignId, { force: forcePayout });
      payoutExecuted = true;
    } catch (err: any) {
      if (err.message && err.message.includes('Payout already completed')) {
        payoutExecuted = true; // Already paid out previously
      } else {
        console.error(`[PickemGrader] Payout failed during campaign finalization:`, err);
        payoutError = err.message || 'Payout failed';
      }
    }
  }

  // 3. Mark campaign ended, closed, and schedule archive
  const campaignRef = adminDb.collection('pickemCampaigns').doc(campaignId);
  const now = Date.now();
  const archiveAt = retentionDays > 0 ? now + (retentionDays * 24 * 60 * 60 * 1000) : now;

  const updatePayload: any = {
    isEnded: true,
    endedAt: now,
    isOpen: false, // Freeze new joins and entries
    archiveAt,
    retentionDays,
    updatedAt: now
  };

  if (payoutExecuted) {
    updatePayload.payoutComplete = true;
  }

  await campaignRef.update(updatePayload);

  // 4. Regenerate leaderboard to reflect final status
  try {
    await generateAndSavePickemLeaderboard(campaignId);
  } catch (err) {
    console.warn(`[PickemGrader] Post-finalization leaderboard update error:`, err);
  }

  return {
    success: true,
    isEnded: true,
    archiveAt,
    retentionDays,
    payoutExecuted,
    payoutError
  };
}
