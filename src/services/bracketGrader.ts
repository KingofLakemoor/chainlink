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

      const baseTeams = bracket.teams?.length || 32;
      const roundNames = baseTeams === 16
          ? ["Round of 16", "Quarter Finals", "Semi Finals", "Finals"]
          : ["Round of 32", "Round of 16", "Quarter Finals", "Semi Finals", "Finals"];

      for (const [mId, pickedTeam] of Object.entries(selections)) {
          const rMatch = mId.match(/r(\d+)-m/);
          if (!rMatch) continue;
          const roundIdx = parseInt(rMatch[1], 10);
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

  // Find top score
  scores.sort((a, b) => b.score - a.score);
  const topScore = scores[0].score;
  const winners = scores.filter(s => s.score === topScore);

  const pot = Math.floor((bracket.totalPot ?? (predictionsSnap.size * (bracket.cost ?? 10))) * (bracket.prizePotPercent ?? 0.60));

  if (winners.length > 0 && pot > 0) {
      const payoutPerWinner = Math.floor(pot / winners.length);

      await adminDb.runTransaction(async (transaction) => {
          // Verify bracket again inside transaction
          const bracketRef = adminDb.collection('brackets').doc(bracketId);
          const bracketTxDoc = await transaction.get(bracketRef);

          if (bracketTxDoc.exists && !bracketTxDoc.data().payoutComplete) {
              // 1. ALL READS FIRST
              const userDocs = [];
              for (const winner of winners) {
                  const userRef = adminDb.collection('users').doc(winner.uid);
                  const userDoc = await transaction.get(userRef);
                  userDocs.push({ ref: userRef, doc: userDoc, winnerUid: winner.uid });
              }

              // 2. THEN ALL WRITES
              for (const { ref, doc, winnerUid } of userDocs) {
                  if (doc.exists) {
                      const currentLinks = doc.data().links || 0;
                      transaction.update(ref, { links: currentLinks + payoutPerWinner });
                      const userDocData = doc.data();
                      const logRef = adminDb.collection('linkTransactions').doc();
                      transaction.set(logRef, {
                        userId: winnerUid,
                        username: userDocData.username || userDocData.name || 'Unknown User',
                        type: 'BRACKET_WIN',
                        amount: payoutPerWinner,
                        description: `Won bracket pot for ${bracket.name || bracketId}`,
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
