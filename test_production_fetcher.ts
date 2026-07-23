import { fetchPlayerStat } from './src/services/propGrader.js';

async function run() {
  const v1 = await fetchPlayerStat({ playerId: "4346117", statType: "STRIKEOUTS", league: "MLB", gameId: "401816234", teamId: "" }, "FULL_GAME" as any);
  const v2 = await fetchPlayerStat({ playerId: "40912", statType: "STRIKEOUTS", league: "MLB", gameId: "401816234", teamId: "" }, "FULL_GAME" as any);
  console.log("Legumina:", v1, "Bieber:", v2);
}
run();
