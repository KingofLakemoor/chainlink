import { fetchScheduleData, getScheduleEndpoints } from './src/services/espnScraper.ts';
async function run() {
  const eps = getScheduleEndpoints('LMX', false, ['20260726']);
  const scheduleData = await fetchScheduleData(eps[0], 'LMX', false);
  const games = scheduleData['20260726']?.games || [];
  console.log("Found games:", games.length);
  for (const game of games) {
     const home = game.competitions?.[0]?.competitors.find(c => c.homeAway === "home");
     const away = game.competitions?.[0]?.competitors.find(c => c.homeAway === "away");
     if (!home || !away) { console.log("Missing home/away"); continue; }
     if (home.team.name.includes("TBD") || away.team.name.includes("TBD")) { console.log("TBD"); continue; }
     console.log(home.team.name, "vs", away.team.name);
  }
}
run();
