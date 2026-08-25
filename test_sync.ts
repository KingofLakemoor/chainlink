import { syncLeagueSchedules } from './src/services/scheduleProcessor.js';

async function run() {
  await syncLeagueSchedules('ARG');
  console.log("Sync done.");
}
run();
