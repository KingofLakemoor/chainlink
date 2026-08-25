import { adminDb } from './src/lib/firebase-admin.js';
import { syncLeagueSchedules } from './src/services/scheduleProcessor.js';

async function run() {
  if (!adminDb) return;
  await syncLeagueSchedules('WTA', true, undefined, new Set(), new Set());
}
run();
