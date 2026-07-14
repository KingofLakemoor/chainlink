import * as firebaseAdmin from '../lib/firebase-admin.js';

// Allows test script to override adminDb
let getAdminDb = () => firebaseAdmin.adminDb;
export function setAdminDbMock(mock: any) { getAdminDb = () => mock; }

export async function gradeMatchups(matchups: any[]) {
  if (!getAdminDb()) {
    throw new Error("[Grader] adminDb is not initialized. Skipping grading.");
  }

  const finalMatchups = matchups.filter(m => m.status === 'STATUS_FINAL' || m.status === 'STATUS_POSTPONED');
  if (finalMatchups.length === 0) return;

  for (const matchup of finalMatchups) {
    try {
      await gradeSingleMatchup(matchup);
    } catch (e: any) {
      console.error(`[Grader] Error grading matchup ${matchup.gameId}:`, e);
    }
  }
}

export async function gradeSingleMatchup(matchup: any) {
  const adminDb = getAdminDb();
  if (!adminDb) {
    throw new Error("[Grader] adminDb is not initialized. Skipping grading.");
  }

  const picksRef = adminDb.collection('picks');
  const pendingPicksSnap = await picksRef
    .where('matchupId', '==', matchup.gameId)
    .where('status', '==', 'PENDING')
    .get();

  if (pendingPicksSnap.empty) {
    return;
  }

  // Fetch achievements and earnable titles once for the matchup grading run
  const achievementsSnap = await adminDb.collection('achievements').get();
  const allAchievements = achievementsSnap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));

  const shopItemsSnap = await adminDb.collection('shopItems').where('type', '==', 'TITLE').where('forSale', '==', false).get();
  const earnableTitles = shopItemsSnap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));

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

  if (isPostponed) {
    isTie = true; // Treats postponed as a push to refund
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
  } else if (matchup.type === 'STATS') {
    if (homeScore === awayScore) {
      isTie = true;
    } else if (matchup.typeDetails === 'LESS_THAN') {
      winnerId = homeScore < awayScore ? matchup.homeTeam.id : matchup.awayTeam.id;
    } else {
      // Default to GREATER_THAN logic
      winnerId = homeScore > awayScore ? matchup.homeTeam.id : matchup.awayTeam.id;
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
    const userId = pickData.userId;
    const wager = pickData.links ?? 0;

    let pickStatus = 'LOSS';
    if (isTie) {
      pickStatus = 'PUSH';
    } else if (pickData.pick?.id === winnerId) {
      pickStatus = 'WIN';
    }

    try {
      await adminDb.runTransaction(async (transaction: any) => {
        const userRef = adminDb!.collection('users').doc(userId);
        const chainRef = adminDb!.collection('chains').doc(`${userId}_current`);

        const pickRefGet = await transaction.get(pickDoc.ref);
        if (!pickRefGet.exists || pickRefGet.data()?.status !== 'PENDING') {
           console.warn(`[Grader] Pick ${pickDoc.id} is no longer PENDING or does not exist. Skipping.`);
           return;
        }

        const userDoc = await transaction.get(userRef);
        const chainDoc = await transaction.get(chainRef);

        if (!userDoc.exists) return;

        const userData = userDoc.data()!;
        let links = userData.links || 0;
        let stats = userData.stats || { wins: 0, losses: 0, pushes: 0 };
        let allTimeStats = userData.allTimeStats || { wins: stats.wins, losses: stats.losses, pushes: stats.pushes };
        let statsByLeague = userData.statsByLeague || {};
        let achievements = userData.achievements || [];
        let inventory = userData.inventory || [];

        const matchupLeague = matchup.league || 'UNKNOWN';
        if (!statsByLeague[matchupLeague]) {
          statsByLeague[matchupLeague] = { wins: 0, losses: 0, pushes: 0 };
        }

        let chainData = chainDoc.exists ? chainDoc.data()! : { chain: 0, wins: 0, losses: 0, best: 0, allTimeBest: 0 };
        let allTimeBest = chainData.allTimeBest || chainData.best || 0;

        // Apply logic
        if (pickStatus === 'WIN') {
          // Typically reward is cost * 2, let's assume standard wager * 2 for win
          links += wager + (matchup.reward ?? 10);
          stats.wins += 1;
          allTimeStats.wins += 1;
          statsByLeague[matchupLeague].wins += 1;
          chainData.chain = chainData.chain < 0 ? 1 : chainData.chain + 1;
          chainData.wins += 1;
          if (chainData.chain > (chainData.best || 0)) {
            chainData.best = chainData.chain;
          }
          if (chainData.chain > allTimeBest) {
            allTimeBest = chainData.chain;
          }
        } else if (pickStatus === 'LOSS') {
          stats.losses += 1;
          allTimeStats.losses += 1;
          statsByLeague[matchupLeague].losses += 1;
          chainData.chain = chainData.chain > 0 ? -1 : (chainData.chain === 0 ? -1 : chainData.chain - 1);
          chainData.losses += 1;
        } else if (pickStatus === 'PUSH') {
          // Refund wager
          links += wager;
          stats.pushes += 1;
          allTimeStats.pushes += 1;
          statsByLeague[matchupLeague].pushes += 1;
          // Chain typically doesn't break on a push, but doesn't increase
        }

        // Check Achievements
        const earnedAchievements: any[] = [];
        allAchievements.forEach(ach => {
          // Check if already earned
          if (achievements.some((a: any) => a.achievementId === ach.id)) return;

          let earned = false;
          const threshold = Number(ach.threshold || 0);

          if (ach.type === 'CHAINWIN' && chainData.chain >= threshold) {
            earned = true;
          } else if (ach.type === 'CHAINLOSS' && chainData.chain <= -threshold) {
            earned = true;
          } else if (ach.type === 'WINS' && allTimeStats.wins >= threshold) {
            earned = true;
          } else if (ach.type === 'LOSS' && allTimeStats.losses >= threshold) {
            earned = true;
          } else if (ach.type === 'PUSH' && allTimeStats.pushes >= threshold) {
            earned = true;
          } else if (ach.type === 'MONTHLYWIN' && stats.wins >= threshold) {
            earned = true;
          } else if (ach.type === 'MONTHLYLOSS' && stats.losses >= threshold) {
            earned = true;
          } else if (ach.type === 'MONTHLYPUSH' && stats.pushes >= threshold) {
            earned = true;
          }

          if (earned) {
            earnedAchievements.push(ach);
            achievements.push({
              achievementId: ach.id,
              unlockedAt: Date.now()
            });
            const achReward = Number(ach.coins || ach.links || 0);
            links += achReward;
            if (achReward > 0) {
              const logRef = adminDb.collection('linkTransactions').doc();
              transaction.set(logRef, {
                userId: userId,
                username: userData.username || userData.name || 'Unknown User',
                type: 'ACHIEVEMENT_REWARD',
                amount: achReward,
                description: `Reward for achievement: ${ach.name}`,
                createdAt: Date.now()
              });
            }
          }
        });

        // Earned Titles from Achievements
        earnableTitles.forEach(title => {
          if (inventory.includes(title.id)) return;

          let earned = false;
          // Heuristic matching based on description text from `shop_items.json`
          if (title.name === 'On Fire' && chainData.chain >= 5) earned = true;
          else if (title.name === 'Absolute Heater' && chainData.chain >= 10) earned = true;
          else if (title.name === 'Needs a Win' && chainData.chain <= -5) earned = true;

          if (earned) {
            inventory.push(title.id);
          }
        });

        // Check for W10 Chain Global Notification
        if (pickStatus === 'WIN' && chainData.chain === 10) {
          const globalNotifRef = adminDb!.collection('notifications').doc();
          transaction.set(globalNotifRef, {
            title: '🔥 W10 Chain Alert!',
            body: `${userData.username || userData.name || 'A user'} just hit an incredible 10-win chain!`,
            audience: 'GLOBAL',
            status: 'PENDING',
            scheduledTime: Date.now(),
            createdAt: Date.now()
          });
        }

        // Write updates
        transaction.update(pickDoc.ref, {
          status: pickStatus,
          updatedAt: Date.now()
        });

        transaction.update(userRef, {
          links,
          stats,
          allTimeStats,
          statsByLeague,
          achievements,
          inventory,
          updatedAt: Date.now()
        });

        transaction.set(chainRef, {
          ...chainData,
          allTimeBest,
          userId,
          active: true,
          updatedAt: Date.now()
        }, { merge: true });

        // Queue notification
        const notificationsRef = adminDb!.collection('notifications').doc();
        const opponentName = pickData.pick?.id === matchup.homeTeam?.id ? matchup.awayTeam?.name : matchup.homeTeam?.name;
        const pickedName = pickData.pick?.id === matchup.homeTeam?.id ? matchup.homeTeam?.name : matchup.awayTeam?.name;

        let notifTitle = '';
        let notifBody = '';
        let transactionType = '';
        let transactionAmount = 0;
        let transactionDesc = '';

        if (pickStatus === 'WIN') {
          notifTitle = 'Pick Won! 🎉';
          notifBody = `Your pick on ${pickedName} vs ${opponentName} won! You earned ${wager + (matchup.reward ?? 10)} links.`;
          transactionType = 'PICK_WIN';
          transactionAmount = wager + (matchup.reward ?? 10);
          transactionDesc = `Won pick on ${pickedName} vs ${opponentName}`;
        } else if (pickStatus === 'LOSS') {
          notifTitle = 'Pick Lost 😢';
          notifBody = `Your pick on ${pickedName} vs ${opponentName} lost. Better luck next time!`;
        } else if (pickStatus === 'PUSH') {
          notifTitle = 'Pick Pushed 🤝';
          notifBody = `Your pick on ${pickedName} vs ${opponentName} was a push. Your wager of ${wager} links was refunded.`;
          transactionType = 'PICK_PUSH';
          transactionAmount = wager;
          transactionDesc = `Push refund for ${pickedName} vs ${opponentName}`;
        }

        if (transactionAmount > 0) {
          const logRef = adminDb.collection('linkTransactions').doc();
          transaction.set(logRef, {
            userId: userId,
            username: userData.username || userData.name || 'Unknown User',
            type: transactionType,
            amount: transactionAmount,
            description: transactionDesc,
            createdAt: Date.now()
          });
        }

        transaction.set(notificationsRef, {
          title: notifTitle,
          body: notifBody,
          audience: 'USER',
          targetUserId: userId,
          status: 'PENDING',
          scheduledTime: Date.now(),
          createdAt: Date.now()
        });
      });

    } catch (err) {
      console.error(`[Grader] Failed to grade pick ${pickDoc.id}:`, err);
    }
  }
}
