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
  const bracketRef = adminDb.collection('brackets').doc('sample-nba-bracket');

  await bracketRef.set({
    name: "2026 NBA Championship Bracket",
    sport: "NBA",
    teams: [
      "Boston Celtics", "Miami Heat",
      "New York Knicks", "Philadelphia 76ers",
      "Milwaukee Bucks", "Indiana Pacers",
      "Cleveland Cavaliers", "Orlando Magic",
      "Oklahoma City Thunder", "New Orleans Pelicans",
      "Denver Nuggets", "Los Angeles Lakers",
      "Minnesota Timberwolves", "Phoenix Suns",
      "LA Clippers", "Dallas Mavericks"
    ],
    pointValues: {
      "Round 1": 10,
      "Quarter Finals": 20,
      "Semi Finals": 40,
      "Finals": 80
    },
    cost: 10,
    prizePotPercent: 0.65,
    payoutSplit: { first: 70, second: 20, third: 10 },
    isPublic: true,
    maxEntries: 0,
    openDate: Date.now(),
    lockDate: Date.now() + 86400000 * 30,
    status: 'OPEN',
    createdAt: Date.now(),
    updatedAt: Date.now()
  }, { merge: true });

  console.log("Seeded sample NBA bracket.");
}

seed();
