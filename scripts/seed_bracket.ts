import { adminDb } from '../src/lib/firebase-admin.ts';
import { scrapeLeagueSchedules } from '../src/services/espnScraper.ts';

const defaultTeams = [
  "Canada", "Morocco",
  "Paraguay", "France",
  "Brazil", "Norway",
  "Mexico", "England",
  "Portugal", "Spain",
  "United States", "Belgium",
  "Argentina", "Egypt",
  "Switzerland", "Colombia"
];

// Fallback match times corresponding to defaultTeams (r0-m0 to r0-m7)
const defaultMatchTimes: Record<string, string> = {
  'r0-m0': '2026-07-04T17:00:00.000Z',
  'r0-m1': '2026-07-04T21:00:00.000Z',
  'r0-m2': '2026-07-05T20:00:00.000Z',
  'r0-m3': '2026-07-06T00:00:00.000Z',
  'r0-m4': '2026-07-06T19:00:00.000Z',
  'r0-m5': '2026-07-07T00:00:00.000Z',
  'r0-m6': '2026-07-07T16:00:00.000Z',
  'r0-m7': '2026-07-07T20:00:00.000Z'
};

const defaultMatchIds: Record<string, string> = {
  'r0-m0': '760502',
  'r0-m1': '760503',
  'r0-m2': '760504',
  'r0-m3': '760505',
  'r0-m4': '760506',
  'r0-m5': '760507',
  'r0-m6': '760509',
  'r0-m7': '760508'
};


async function seed() {
  const bracketRef = adminDb.collection('brackets').doc('world-cup-2026');

  const res = await scrapeLeagueSchedules('FIFA');
  const allFifaMatchups = res.data || [];

  // Only consider matchups on or after July 4th (Arizona time, UTC-7)
  const fifaMatchups = allFifaMatchups.filter(m => new Date(m.startTime) >= new Date('2026-07-04T07:00:00.000Z'));

  const matchTimes: Record<string, string> = { ...defaultMatchTimes };
  const matchIds: Record<string, string> = { ...defaultMatchIds };
  const bracketTeams: string[] = [...defaultTeams];

  // Update match times dynamically if the matchup exists in the filtered ESPN data
  for (let i = 0; i < bracketTeams.length / 2; i++) {
     const mIdKey = `r0-m${i}`;
     const gameId = matchIds[mIdKey];

     const matchedGame = fifaMatchups.find(m => m.gameId === gameId);

     if (matchedGame) {
       matchTimes[mIdKey] = new Date(matchedGame.startTime).toISOString();
     }
  }

  await bracketRef.set({
    name: "2026 World Cup Bracket",
    sport: "World Cup 2026",
    teams: bracketTeams,
    pointValues: {
      "Round of 16": 20,
      "Quarter Finals": 40,
      "Semi Finals": 80,
      "Finals": 160
    },
    cost: 10,
    prizePotPercent: 0.60,
    isPublic: true,
    maxEntries: 0,
    openDate: Date.now(),
    lockDate: Date.now() + 86400000 * 30, // 30 days lock
    matchTimes,
    matchIds,
    status: 'OPEN',
    createdAt: Date.now(),
    updatedAt: Date.now()
  }, { merge: true });

  console.log("Seeded world cup bracket.");
}

seed();
