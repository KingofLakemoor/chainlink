import { adminDb } from '../src/lib/firebase-admin.js';
import { gradePickemMatchups } from '../src/services/pickemGrader.js';

async function run() {
  if (!adminDb) {
    console.error("Admin DB not initialized");
    return;
  }

  console.log("Fetching pending pickem picks...");
  const pendingPicksSnap = await adminDb.collection('pickemPicks').where('status', '==', 'PENDING').get();

  if (pendingPicksSnap.empty) {
    console.log("No pending picks found.");
    return;
  }

  const pendingMatchupIds = new Set<string>();
  pendingPicksSnap.forEach(doc => {
    const data = doc.data();
    if (data.matchupId) {
      pendingMatchupIds.add(data.matchupId);
    }
  });

  console.log(`Found ${pendingMatchupIds.size} unique matchups with pending picks.`);

  const matchupsToGrade: any[] = [];
  const matchupIdsArray = Array.from(pendingMatchupIds);

  for (let i = 0; i < matchupIdsArray.length; i += 30) {
    const chunk = matchupIdsArray.slice(i, i + 30);
    const matchupsSnap = await adminDb.collection('pickemMatchups').where('__name__', 'in', chunk).get();

    for (const doc of matchupsSnap.docs) {
      const matchupData = doc.data();
      if (matchupData.status === 'STATUS_FINAL' || matchupData.status === 'STATUS_POSTPONED') {
        matchupsToGrade.push({ id: doc.id, ...matchupData });
      }
    }
  }

  console.log(`Found ${matchupsToGrade.length} final/postponed matchups to grade.`);

  if (matchupsToGrade.length > 0) {
    console.log("Grading matchups...");
    await gradePickemMatchups(matchupsToGrade);
    console.log("Grading complete.");
  }
}

run().catch(console.error);
