import * as firebaseAdmin from '../lib/firebase-admin.js';

let getAdminDb = () => firebaseAdmin.adminDb;
export function setAdminDbMock(mock: any) { getAdminDb = () => mock; }

export async function gradeBrackets(matchups: any[]) {
  const adminDb = getAdminDb();
  if (!adminDb || matchups.length === 0) return;

  const finalMatchups = matchups.filter(m => m.status === 'STATUS_FINAL');
  if (finalMatchups.length === 0) return;

  const bracketsSnap = await adminDb.collection('brackets').get();
  if (bracketsSnap.empty) return;

  for (const bracketDoc of bracketsSnap.docs) {
    const bracket = bracketDoc.data();
    let updated = false;
    const results = bracket.results || {};
      const matchIds = bracket.matchIds || {};
    const eliminatedTeams = bracket.eliminatedTeams || [];

    for (const matchup of finalMatchups) {
      if (bracket.sport === 'World Cup 2026') {
         if (matchup.league !== 'FIFA') continue;
      }
      if (bracket.sport === 'MLB') {
         if (matchup.league !== 'MLB') continue;
      }

      const homeTeam = matchup.homeTeam?.name;
      const awayTeam = matchup.awayTeam?.name;

      const homeScore = Number(matchup.homeTeam?.score || 0);
      const awayScore = Number(matchup.awayTeam?.score || 0);

      let winner = null;
      let loser = null;

      if (homeScore > awayScore) {
          winner = homeTeam;
          loser = awayTeam;
      } else if (awayScore > homeScore) {
          winner = awayTeam;
          loser = homeTeam;
      }

      if (winner && loser) {
         if (!eliminatedTeams.includes(loser)) {
             eliminatedTeams.push(loser);
             updated = true;
         }

         const rounds = [bracket.teams || []];
         let r = 0;
         let matchFound = false;

         while (r < 5) {
             const currentRoundTeams = rounds[r];
             if (!currentRoundTeams || currentRoundTeams.length < 2) break;

             const nextRoundTeams = new Array(currentRoundTeams.length / 2).fill(null);

             for (let i = 0; i < currentRoundTeams.length / 2; i++) {
                 const t1 = currentRoundTeams[i * 2];
                 const t2 = currentRoundTeams[i * 2 + 1];

                 const mId = `r${r}-m${i}`;

                 const isMatchById = bracket.matchIds && bracket.matchIds[mId] === matchup.gameId;
                 const isMatchByTeams = t1 && t2 && ((t1 === winner && t2 === loser) || (t1 === loser && t2 === winner));

                 if (isMatchById || isMatchByTeams) {
                     if (isMatchByTeams && matchIds[mId] !== matchup.gameId) {
                         matchIds[mId] = matchup.gameId;
                         updated = true;
                     }
                     if (results[mId] !== winner) {
                         results[mId] = winner;
                         updated = true;
                     }
                     matchFound = true;
                 }

                 if (results[mId]) {
                     nextRoundTeams[i] = results[mId];
                 }
             }

             rounds.push(nextRoundTeams);
             r++;
             if (matchFound) break;
         }
      }
    }

    if (updated) {
        await adminDb.collection('brackets').doc(bracketDoc.id).update({
            results,
            matchIds,
            eliminatedTeams
        });
    }

    // Dynamically determine the final match ID based on the number of base teams
    const baseTeams = bracket.teams?.length || 32;
    const totalRounds = Math.log2(baseTeams);
    const finalMatchId = `r${totalRounds - 1}-m0`;

    // Check if bracket payout is complete, else pay out if finals are done
    if (results[finalMatchId] && !bracket.payoutComplete) {
       await payoutBracket(bracketDoc.id, bracket, results);
    }
  }
}

async function payoutBracket(bracketId: string, bracket: any, currentResults: any) {
  const adminDb = getAdminDb();
  if (!adminDb) return;

  const results = currentResults || {};
  const pointValues = bracket.pointValues || {
    "Round of 32": 10,
    "Round of 16": 20,
    "Quarter Finals": 40,
    "Semi Finals": 80,
    "Finals": 160
  };

  const explicitlyEliminated = bracket.eliminatedTeams || [];

  const predictionsSnap = await adminDb.collection('bracketGamePredictions')
      .where('bracketId', '==', bracketId)
      .get();

  if (predictionsSnap.empty) {
      // No predictions, just mark complete
      await adminDb.collection('brackets').doc(bracketId).update({ payoutComplete: true });
      return;
  }

  const scores: {uid: string, score: number}[] = [];
  for (const doc of predictionsSnap.docs) {
      const data = doc.data();
      const selections = data.selections || {};
      let pts = 0;

      const isMlb = bracket.sport === 'MLB' || bracket.id?.includes('mlb');
      const baseTeams = bracket.teams?.length || 32;
      const roundNames = isMlb
          ? ["Wild Card Series", "Division Series", "League Championship Series", "World Series"]
          : baseTeams === 16
          ? ["Round of 16", "Quarter Finals", "Semi Finals", "Finals"]
          : ["Round of 32", "Round of 16", "Quarter Finals", "Semi Finals", "Finals"];

      for (const [mId, pickedTeam] of Object.entries(selections)) {
          const rMatch = mId.match(/r(\d+)-m(\d+)/);
          if (!rMatch) continue;
          const roundIdx = parseInt(rMatch[1], 10);
          const matchIdx = parseInt(rMatch[2], 10);

          if (roundIdx === 0 && bracket.teams) {
            const t1 = bracket.teams[matchIdx * 2];
            const t2 = bracket.teams[matchIdx * 2 + 1];
            if (t1 === 'BYE' || t2 === 'BYE') {
              continue;
            }
          }

          const roundName = roundNames[roundIdx];
          const rPts = pointValues[roundName] || 0;

          if (results[mId] && results[mId] === pickedTeam) {
              pts += rPts;
          }
      }
      const uid = data.userId || doc.id.split('_')[1];
      if (uid) {
        scores.push({ uid, score: pts });
      }
  }

  if (scores.length === 0) return;

  // Calculate total pot and prize distribution
  const prizePotPercent = bracket.prizePotPercent ?? 0.65;
  const totalEntriesPot = bracket.totalPot ?? (predictionsSnap.size * (bracket.cost ?? 10));
  const totalPrizePot = Math.floor(totalEntriesPot * prizePotPercent);

  const payoutSplit = bracket.payoutSplit || { first: 70, second: 20, third: 10 };
  const firstPot = Math.floor(totalPrizePot * ((payoutSplit.first ?? 70) / 100));
  const secondPot = Math.floor(totalPrizePot * ((payoutSplit.second ?? 20) / 100));
  const thirdPot = Math.floor(totalPrizePot * ((payoutSplit.third ?? 10) / 100));

  scores.sort((a, b) => b.score - a.score);

  const uniqueScores = Array.from(new Set(scores.map(s => s.score))).sort((a, b) => b - a);

  const tier1 = scores.filter(s => s.score === uniqueScores[0]);
  const tier2 = uniqueScores.length > 1 ? scores.filter(s => s.score === uniqueScores[1]) : [];
  const tier3 = uniqueScores.length > 2 ? scores.filter(s => s.score === uniqueScores[2]) : [];

  const payoutsToDistribute: { uid: string; amount: number; rankName: string }[] = [];

  if (tier1.length >= 3) {
    const potForTier1 = firstPot + secondPot + thirdPot;
    const share = Math.floor(potForTier1 / tier1.length);
    if (share > 0) {
      tier1.forEach(s => payoutsToDistribute.push({ uid: s.uid, amount: share, rankName: '1st Place (Tied)' }));
    }
  } else if (tier1.length === 2) {
    const potForTier1 = firstPot + secondPot;
    const share = Math.floor(potForTier1 / 2);
    if (share > 0) {
      tier1.forEach(s => payoutsToDistribute.push({ uid: s.uid, amount: share, rankName: '1st Place (Tied)' }));
    }
    if (tier2.length > 0 && thirdPot > 0) {
      const share3 = Math.floor(thirdPot / tier2.length);
      if (share3 > 0) {
        tier2.forEach(s => payoutsToDistribute.push({ uid: s.uid, amount: share3, rankName: tier2.length > 1 ? '3rd Place (Tied)' : '3rd Place' }));
      }
    }
  } else if (tier1.length === 1) {
    if (firstPot > 0) {
      payoutsToDistribute.push({ uid: tier1[0].uid, amount: firstPot, rankName: '1st Place' });
    }
    if (tier2.length >= 2) {
      const potForTier2 = secondPot + thirdPot;
      const share2 = Math.floor(potForTier2 / tier2.length);
      if (share2 > 0) {
        tier2.forEach(s => payoutsToDistribute.push({ uid: s.uid, amount: share2, rankName: '2nd Place (Tied)' }));
      }
    } else if (tier2.length === 1) {
      if (secondPot > 0) {
        payoutsToDistribute.push({ uid: tier2[0].uid, amount: secondPot, rankName: '2nd Place' });
      }
      if (tier3.length > 0 && thirdPot > 0) {
        const share3 = Math.floor(thirdPot / tier3.length);
        if (share3 > 0) {
          tier3.forEach(s => payoutsToDistribute.push({ uid: s.uid, amount: share3, rankName: tier3.length > 1 ? '3rd Place (Tied)' : '3rd Place' }));
        }
      }
    }
  }

  if (payoutsToDistribute.length > 0) {
      await adminDb.runTransaction(async (transaction) => {
          // Verify bracket again inside transaction
          const bracketRef = adminDb.collection('brackets').doc(bracketId);
          const bracketTxDoc = await transaction.get(bracketRef);

          if (bracketTxDoc.exists && !bracketTxDoc.data().payoutComplete) {
              // 1. ALL READS FIRST
              const userDocs = await Promise.all(payoutsToDistribute.map(async (p) => {
                  const userRef = adminDb.collection('users').doc(p.uid);
                  const userDoc = await transaction.get(userRef);
                  return { ref: userRef, doc: userDoc, item: p };
              }));

              // 2. THEN ALL WRITES
              for (const { ref, doc, item } of userDocs) {
                  if (doc.exists) {
                      const currentLinks = doc.data().links || 0;
                      transaction.update(ref, { links: currentLinks + item.amount });
                      const userDocData = doc.data();
                      const logRef = adminDb.collection('linkTransactions').doc();
                      transaction.set(logRef, {
                        userId: item.uid,
                        username: userDocData.username || userDocData.name || 'Unknown User',
                        type: 'BRACKET_WIN',
                        amount: item.amount,
                        description: `Won ${item.rankName} in Bracket: ${bracket.name || bracketId}`,
                        createdAt: Date.now()
                      });

                      const notificationsRef = adminDb.collection('notifications').doc();
                      transaction.set(notificationsRef, {
                        title: `Bracket Winner! 🎉`,
                        body: `You finished ${item.rankName} in ${bracket.name || 'Bracket'}! ${item.amount} links have been added to your account.`,
                        audience: 'USER',
                        targetUserId: item.uid,
                        status: 'PENDING',
                        scheduledTime: Date.now(),
                        createdAt: Date.now()
                      });
                  }
              }
              transaction.update(bracketRef, { payoutComplete: true });
          }
      });
  } else {
      await adminDb.collection('brackets').doc(bracketId).update({ payoutComplete: true });
  }
}
