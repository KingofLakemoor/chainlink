import { syncLeagueSchedules } from "./src/services/scheduleProcessor.js";

async function testSync() {
  console.log("Syncing NBA...");
  const nbares = await syncLeagueSchedules("NBA");
  console.log("NBA:", nbares);
  
  console.log("Syncing MLB...");
  const mlbres = await syncLeagueSchedules("MLB");
  console.log("MLB:", mlbres);
  
  console.log("Syncing PGA...");
  const pgares = await syncLeagueSchedules("PGA");
  console.log("PGA:", pgares);
}

testSync();
