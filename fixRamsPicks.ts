import dotenv from 'dotenv';
dotenv.config();
import { adminDb } from './src/lib/firebase-admin.js';
import { isTeamMatch } from './src/lib/teamUtils.js';

async function main() {
  if (!adminDb) {
    console.error("adminDb is not initialized.");
    process.exit(1);
  }

  const targetUsernames = ['cpr1staid', 'kingoflakemoor'];
  console.log(`Searching for users: ${targetUsernames.join(', ')}...`);

  const usersSnap = await adminDb.collection('users').get();
  const targetUsers = usersSnap.docs.filter(d => {
    const uname = d.data().username || '';
    return targetUsernames.includes(uname);
  });

  if (targetUsers.length === 0) {
    console.log("No matching users found.");
    return;
  }

  const ramsTeam = { name: 'Los Angeles Rams', shortName: 'Rams', abbreviation: 'LAR' };

  for (const userDoc of targetUsers) {
    const userData = userDoc.data();
    const uid = userDoc.id;
    const username = userData.username;

    console.log(`\nProcessing user: ${username} (UID: ${uid})`);

    const picksSnap = await adminDb.collection('link4Picks').where('userId', '==', uid).get();
    if (picksSnap.empty) {
      console.log(`No link4Picks found for ${username}.`);
      continue;
    }

    for (const pickDoc of picksSnap.docs) {
      const pickData = pickDoc.data();
      let picksArray = Array.isArray(pickData.picks) ? pickData.picks : [];
      let isModified = false;
      let ramsFound = false;

      const updatedPicks = picksArray.map((p: any) => {
        const isRams = isTeamMatch(p.name, ramsTeam) || (p.name && p.name.toLowerCase().includes('rams'));
        if (isRams) {
          ramsFound = true;
          if (p.status !== 'LOSS') {
            isModified = true;
          }
          return { ...p, status: 'LOSS' };
        }
        return p;
      });

      if (ramsFound) {
        // If Rams was picked, ensure any remaining PENDING picks are marked CANCELLED and hasLoss is true
        const finalPicks = updatedPicks.map((p: any) => {
          if (p.status === 'PENDING') {
            isModified = true;
            return { ...p, status: 'CANCELLED' };
          }
          return p;
        });

        const updatePayload: any = {
          picks: finalPicks,
          hasLoss: true,
          updatedAt: Date.now()
        };

        await adminDb.collection('link4Picks').doc(pickDoc.id).update(updatePayload);
        console.log(`Successfully updated link4Picks doc ${pickDoc.id} for user ${username}.`);
        console.log("Updated picks:", JSON.stringify(finalPicks, null, 2));
      } else {
        console.log(`No Rams pick found in doc ${pickDoc.id} for user ${username}.`);
      }
    }
  }

  console.log("\nDone!");
}

main().catch(err => {
  console.error("Error running fixRamsPicks:", err);
  process.exit(1);
});
