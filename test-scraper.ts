import { scrapeLeagueSchedules } from './src/services/espnScraper.js';

async function run() {
  const result = await scrapeLeagueSchedules('NBASL');
  console.log("NBASL gamesOnSchedule:", result.gamesOnSchedule);
  console.log("NBASL matchups parsed:", result.data?.length);

  const lmx = await scrapeLeagueSchedules('LMX');
  console.log("LMX gamesOnSchedule:", lmx.gamesOnSchedule);
  console.log("LMX matchups parsed:", lmx.data?.length);
  
  const cfl = await scrapeLeagueSchedules('CFL');
  console.log("CFL gamesOnSchedule:", cfl.gamesOnSchedule);
  console.log("CFL matchups parsed:", cfl.data?.length);
}
run();
