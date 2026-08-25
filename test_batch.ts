import { adminDb } from './src/lib/firebase-admin.js';
import { scrapeLeagueSchedules } from './src/services/espnScraper.js';
import { syncLeagueSchedules } from './src/services/scheduleProcessor.js';

async function run() {
  if (!adminDb) return;
  console.log("Starting quick sync...");
  await syncLeagueSchedules('WTA', true, undefined, new Set(), new Set());
  console.log("Finished quick sync. Starting full sync...");
  await syncLeagueSchedules('WTA', false, undefined, new Set(), new Set());
  console.log("Finished full sync.");
}
run();
