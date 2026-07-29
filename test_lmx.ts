import { syncLeagueSchedules } from './src/services/scheduleProcessor.ts';
import { adminDb } from './src/lib/firebase-admin.ts';

async function run() {
  try {
    const res = await syncLeagueSchedules('LMX');
    console.log(res);
  } catch(e) {
    console.error(e);
  }
}
run();
