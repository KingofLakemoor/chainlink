import { adminDb } from '../src/lib/firebase-admin.js';
import { syncLeagueSchedules } from '../src/services/scheduleProcessor.js';
import { gradePickemMatchups } from '../src/services/pickemGrader.js';

async function run() {
  if (!adminDb) {
    console.error("No adminDb found");
    return;
  }

  console.log("Fetching pickemMatchups...");
  const pickemSnaps = await adminDb.collection('pickemMatchups').get();
  console.log(`Found ${pickemSnaps.size} pickem matchups in total.`);

  const now = Date.now();
  const TWELVE_HOURS = 12 * 60 * 60 * 1000;

  // Maps League -> Set of YYYYMMDD string
  const datesToSync: Record<string, Set<string>> = {};
  let stuckCount = 0;
  const stuckDocIds: string[] = [];

  for (const doc of pickemSnaps.docs) {
    const data = doc.data();
    if (data.status === 'STATUS_FINAL' || data.status === 'STATUS_POSTPONED' || data.status === 'STATUS_ABANDONED') {
      continue;
    }

    if (data.startTime && (now - data.startTime) > TWELVE_HOURS) {
      stuckCount++;
      stuckDocIds.push(doc.id);

      // Determine league by fetching the original matchup
      let league = 'MLB'; // Default, we will try to look it up
      if (data.gameId) {
         const mSnap = await adminDb.collection('matchups').doc(data.gameId).get();
         if (mSnap.exists) {
            league = mSnap.data()?.league || 'MLB';
         }
      }

      const d = new Date(data.startTime);
      const str = d.toLocaleString("en-US", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" });
      const [month, day, year] = str.split("/");
      const dateStr = `${year}${month}${day}`;

      if (!datesToSync[league]) {
        datesToSync[league] = new Set();
      }
      datesToSync[league].add(dateStr);

      console.log(`Found stuck game: ${data.title} (${data.gameId}) from ${new Date(data.startTime).toISOString()} - League: ${league}`);
    }
  }

  console.log(`\nFound ${stuckCount} stuck pickem matchups that need syncing.\n`);

  for (const league of Object.keys(datesToSync)) {
    const dates = Array.from(datesToSync[league]);
    console.log(`Syncing ${league} for dates: ${dates.join(', ')}...`);

    try {
        const result = await syncLeagueSchedules(league, true, dates);
        console.log(`Sync result for ${league}: Updated ${result.matchupsUpdated}, New ${result.scoreMatchupsCreated}, Error: ${result.error || 'None'}`);
    } catch(err) {
        console.error(`Error syncing ${league}:`, err);
    }
  }

  console.log("Synchronizing updated original matchups to pickem matchups...");
  const pickemMatchupsToGrade: any[] = [];

  if (stuckDocIds.length > 0) {
    let batch = adminDb.batch();
    let opCount = 0;
    let updateCount = 0;

    for (const docId of stuckDocIds) {
      const docRef = adminDb.collection('pickemMatchups').doc(docId);
      const pSnap = await docRef.get();
      if (!pSnap.exists) continue;

      const pData = pSnap.data() as any;
      if (!pData.gameId) continue;

      const matchupSnap = await adminDb.collection('matchups').doc(pData.gameId).get();
      if (!matchupSnap.exists) {
          console.warn(`Original matchup ${pData.gameId} not found for pickemMatchup ${docId}`);
          continue;
      }

      const matchup = matchupSnap.data() as any;
      const updateData = {
        status: matchup.status,
        statusDesc: matchup.statusDesc,
        'homeTeam.score': matchup.homeTeam?.score ?? 0,
        'awayTeam.score': matchup.awayTeam?.score ?? 0,
        updatedAt: Date.now()
      };

      if (pData.status !== updateData.status ||
          pData.statusDesc !== updateData.statusDesc ||
          pData.homeTeam?.score !== updateData['homeTeam.score'] ||
          pData.awayTeam?.score !== updateData['awayTeam.score']) {

        console.log(`Updating pickemMatchup ${docId} (${pData.title}) to match original matchup: ${updateData.status} (${updateData.statusDesc})`);
        batch.update(docRef, updateData);
        opCount++;
        updateCount++;

        if (opCount >= 500) {
          await batch.commit();
          batch = adminDb.batch();
          opCount = 0;
        }

        if (updateData.status === 'STATUS_FINAL' || updateData.status === 'STATUS_POSTPONED') {
          pickemMatchupsToGrade.push({
            ...pData,
            status: matchup.status,
            statusDesc: matchup.statusDesc,
            homeTeam: { ...(pData.homeTeam || {}), score: matchup.homeTeam?.score ?? 0 },
            awayTeam: { ...(pData.awayTeam || {}), score: matchup.awayTeam?.score ?? 0 },
            id: docId
          });
        }
      }
    }

    if (opCount > 0) {
      await batch.commit();
    }

    console.log(`Updated ${updateCount} pickem matchups.`);
  }

  if (pickemMatchupsToGrade.length > 0) {
      console.log(`Grading ${pickemMatchupsToGrade.length} pickem matchups...`);
      await gradePickemMatchups(pickemMatchupsToGrade);
      console.log("Grading complete.");
  }

  console.log("Done.");
  process.exit(0);
}

run().catch(err => {
  console.error("Error running script:", err);
  process.exit(1);
});
