import { adminDb } from './src/lib/firebase-admin.js';
import { syncLeagueSchedules } from './src/services/scheduleProcessor.js';

async function run() {
  const result = await syncLeagueSchedules('MLB');
  console.log("MLB sync result:", result);
}
run();
