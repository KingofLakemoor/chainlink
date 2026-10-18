/**
 * Apify Equibase US Horse Racing Scraper Service
 * Integration with Apify actor: jungle_synthesizer/equibase-us-horse-racing-scraper
 */

export const EQUIBASE_ACTOR_ID = 'jungle_synthesizer~equibase-us-horse-racing-scraper';

export interface EquibaseRunner {
  programNumber?: string | number;
  postPosition?: number;
  horseName: string;
  jockey?: string;
  trainer?: string;
  morningLineOdds?: string | number;
  mlOddsNumber?: number;
  finishPosition?: number;
  status?: string; // 'ACTIVE', 'SCRATCHED', 'WINNER', 'PLACED', 'SHOW'
}

export interface EquibaseRaceCard {
  raceId: string;
  trackName: string;
  trackCode: string;
  raceNumber: number;
  raceDate: string; // YYYY-MM-DD
  postTimeMs: number;
  distance?: string;
  surface?: string;
  purse?: string | number;
  status: 'STATUS_SCHEDULED' | 'STATUS_IN_PROGRESS' | 'STATUS_FINAL' | 'STATUS_CANCELLED';
  runners: EquibaseRunner[];
  winningHorse?: string;
  winningProgramNumber?: string | number;
  rawPayload?: any;
}

export interface ApifyRunOptions {
  date?: string; // YYYY-MM-DD
  raceDate?: string; // YYYY-MM-DD
  tracks?: string[];
  trackCodes?: string[];
  maxItems?: number;
  datasetId?: string;
  spIntendedUsage?: string;
  sp_intended_usage?: string;
  spImprovementSuggestions?: string;
  sp_improvement_suggestions?: string;
  spContact?: string;
  sp_contact?: string;
  dataMode?: string;
}

/**
 * Returns the configured Apify API token from environment variables.
 */
export function getApifyToken(): string {
  const token = process.env.APIFY_API_TOKEN || process.env.APIFY_TOKEN || '';
  return token.trim();
}

/**
 * Parses post time string or timestamp into numeric Unix milliseconds.
 */
export function parseRacePostTime(postTime: any, dateStr?: string): number {
  if (typeof postTime === 'number' && postTime > 0) {
    return postTime;
  }
  if (!postTime) {
    if (dateStr) {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) return d.getTime();
    }
    return Date.now() + 60 * 60 * 1000; // Fallback 1 hour from now
  }

  const str = String(postTime).trim();
  const parsedDirect = Date.parse(str);
  if (!isNaN(parsedDirect) && parsedDirect > 0) {
    return parsedDirect;
  }

  // Handle format like "3:45 PM EDT" or "15:45"
  if (dateStr) {
    const combinedStr = `${dateStr} ${str}`;
    const parsedCombined = Date.parse(combinedStr);
    if (!isNaN(parsedCombined) && parsedCombined > 0) {
      return parsedCombined;
    }
  }

  return Date.now() + 60 * 60 * 1000;
}

/**
 * Converts morning line odds string e.g. "3/1", "5/2", "12/1", "9/5" to decimal/numeric representation.
 */
export function parseMorningLineOdds(odds: any): number | undefined {
  if (typeof odds === 'number') return odds;
  if (!odds) return undefined;
  const str = String(odds).trim();
  if (str.includes('/')) {
    const parts = str.split('/');
    const num = parseFloat(parts[0]);
    const den = parseFloat(parts[1]);
    if (!isNaN(num) && !isNaN(den) && den > 0) {
      return Math.round((num / den) * 100) / 100;
    }
  }
  const direct = parseFloat(str);
  return isNaN(direct) ? undefined : direct;
}

/**
 * Calculates the implied win probability (0.0 to 1.0) for a horse from morning line odds.
 */
export function calculateImpliedProbability(odds: any): number {
  if (odds === undefined || odds === null || odds === '') return 0.10;
  if (typeof odds === 'number') {
    if (odds <= 0) return 0.10;
    return Math.min(Math.max(1 / odds, 0.01), 0.99);
  }

  const str = String(odds).trim();
  if (str.includes('/')) {
    const [numStr, denStr] = str.split('/');
    const num = parseFloat(numStr);
    const den = parseFloat(denStr);
    if (!isNaN(num) && !isNaN(den) && num + den > 0) {
      return Math.min(Math.max(den / (num + den), 0.01), 0.99);
    }
  }

  const parsed = parseFloat(str);
  if (!isNaN(parsed) && parsed > 0) {
    return Math.min(Math.max(1 / parsed, 0.01), 0.99);
  }

  return 0.10;
}

/**
 * Normalizes raw dataset items returned from the Apify actor into structured EquibaseRaceCard objects.
 */
export function parseEquibaseItems(items: any[]): EquibaseRaceCard[] {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  const raceMap = new Map<string, EquibaseRaceCard>();

  for (const item of items) {
    if (!item) continue;

    // Support both pre-grouped race card objects and flat runner objects
    const trackName = item.trackName || item.track || item.trackCode || 'Unknown Track';
    const trackCode = (item.trackCode || item.track || trackName).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5) || 'TRK';
    const raceNumber = Number(item.raceNumber || item.race_number || item.race || 1);
    const dateStr = item.raceDate || item.date || item.eventDate || new Date().toISOString().split('T')[0];

    const raceKey = `${trackCode}_${dateStr.replace(/-/g, '')}_R${raceNumber}`;

    if (!raceMap.has(raceKey)) {
      const postTimeMs = parseRacePostTime(item.postTime || item.post_time || item.time, dateStr);
      let raceStatus: EquibaseRaceCard['status'] = 'STATUS_SCHEDULED';

      const rawStatus = String(item.status || item.raceStatus || '').toUpperCase();
      if (rawStatus.includes('FINAL') || rawStatus.includes('OFFICIAL') || item.winningHorse || item.winner) {
        raceStatus = 'STATUS_FINAL';
      } else if (rawStatus.includes('RUNNING') || rawStatus.includes('IN_PROGRESS')) {
        raceStatus = 'STATUS_IN_PROGRESS';
      } else if (rawStatus.includes('CANCEL')) {
        raceStatus = 'STATUS_CANCELLED';
      }

      raceMap.set(raceKey, {
        raceId: raceKey,
        trackName,
        trackCode,
        raceNumber,
        raceDate: dateStr,
        postTimeMs,
        distance: item.distance || item.dist,
        surface: item.surface,
        purse: item.purse,
        status: raceStatus,
        runners: [],
        winningHorse: item.winningHorse || item.winner,
        winningProgramNumber: item.winningProgramNumber || item.winningProgram,
        rawPayload: item
      });
    }

    const card = raceMap.get(raceKey)!;

    // Handle nested runners array
    if (Array.isArray(item.runners) && item.runners.length > 0) {
      for (const r of item.runners) {
        const horseName = r.horseName || r.horse || r.name;
        if (!horseName) continue;
        const mlOdds = r.morningLineOdds || r.morningLine || r.mlOdds || r.odds;
        const finishPos = r.finishPosition !== undefined ? Number(r.finishPosition) : (r.finish !== undefined ? Number(r.finish) : undefined);

        card.runners.push({
          programNumber: r.programNumber || r.program || r.number || r.pp,
          postPosition: r.postPosition ? Number(r.postPosition) : undefined,
          horseName: String(horseName).trim(),
          jockey: r.jockey,
          trainer: r.trainer,
          morningLineOdds: mlOdds,
          mlOddsNumber: parseMorningLineOdds(mlOdds),
          finishPosition: finishPos,
          status: r.scratched ? 'SCRATCHED' : (finishPos === 1 ? 'WINNER' : 'ACTIVE')
        });

        if (finishPos === 1 || r.status === 'WINNER') {
          card.winningHorse = String(horseName).trim();
          card.winningProgramNumber = r.programNumber || r.program;
          card.status = 'STATUS_FINAL';
        }
      }
    } else if (item.horseName || item.horse) {
      // Handle flat runner item
      const horseName = item.horseName || item.horse;
      const mlOdds = item.morningLineOdds || item.morningLine || item.mlOdds || item.odds;
      const finishPos = item.finishPosition !== undefined ? Number(item.finishPosition) : (item.finish !== undefined ? Number(item.finish) : undefined);

      card.runners.push({
        programNumber: item.programNumber || item.program || item.number,
        postPosition: item.postPosition ? Number(item.postPosition) : undefined,
        horseName: String(horseName).trim(),
        jockey: item.jockey,
        trainer: item.trainer,
        morningLineOdds: mlOdds,
        mlOddsNumber: parseMorningLineOdds(mlOdds),
        finishPosition: finishPos,
        status: item.scratched ? 'SCRATCHED' : (finishPos === 1 ? 'WINNER' : 'ACTIVE')
      });

      if (finishPos === 1 || item.status === 'WINNER') {
        card.winningHorse = String(horseName).trim();
        card.winningProgramNumber = item.programNumber || item.program;
        card.status = 'STATUS_FINAL';
      }
    }
  }

  return Array.from(raceMap.values());
}

/**
 * Generates balanced "Horse vs Field" and "Horse vs Horse Better Finish" matchups for a race card.
 */
export function generateBalancedHorseRacingMatchups(card: EquibaseRaceCard): any[] {
  const matchups: any[] = [];
  const activeRunners = card.runners.filter(r => r.status !== 'SCRATCHED');

  if (activeRunners.length === 0) {
    return [];
  }

  // Calculate implied probabilities for each runner
  const runnersWithProb = activeRunners.map(r => {
    const prob = calculateImpliedProbability(r.morningLineOdds);
    return { ...r, impliedProb: prob };
  });

  // 1. Horse vs Field Matchup
  let bestFieldHorse = runnersWithProb[0];
  let minDiffFromHalf = Math.abs(bestFieldHorse.impliedProb - 0.50);

  for (const r of runnersWithProb) {
    const diff = Math.abs(r.impliedProb - 0.50);
    if (diff < minDiffFromHalf) {
      minDiffFromHalf = diff;
      bestFieldHorse = r;
    }
  }

  const fieldProb = Math.max(0.01, 1 - bestFieldHorse.impliedProb);
  const horseWon = Boolean(card.winningHorse && card.winningHorse.toLowerCase() === bestFieldHorse.horseName.toLowerCase());
  const fieldWon = Boolean(card.winningHorse && !horseWon);

  const hvfGameId = `equibase_${card.raceId}_hvfield`;
  matchups.push({
    gameId: hvfGameId,
    title: `${card.trackName} R${card.raceNumber}: ${bestFieldHorse.horseName} vs The Field`,
    league: 'HORSE_RACING',
    startTime: card.postTimeMs,
    status: card.status,
    active: true,
    manuallyActivated: true,
    type: 'STANDARD',
    homeTeam: {
      id: `horse_${bestFieldHorse.programNumber || '1'}`,
      name: `${bestFieldHorse.horseName} (${bestFieldHorse.morningLineOdds || 'ML'})`,
      image: '/logo.png',
      score: horseWon ? 1 : 0
    },
    awayTeam: {
      id: 'field',
      name: 'The Field (All Other Runners)',
      image: '/logo.png',
      score: fieldWon ? 1 : 0
    },
    winnerId: card.status === 'STATUS_FINAL' ? (horseWon ? `horse_${bestFieldHorse.programNumber || '1'}` : (fieldWon ? 'field' : undefined)) : undefined,
    metadata: {
      matchupType: 'HORSE_VS_FIELD',
      trackName: card.trackName,
      trackCode: card.trackCode,
      raceNumber: card.raceNumber,
      raceDate: card.raceDate,
      horseImpliedProb: Math.round(bestFieldHorse.impliedProb * 100) / 100,
      fieldImpliedProb: Math.round(fieldProb * 100) / 100,
      runner: bestFieldHorse,
      winningHorse: card.winningHorse || null
    },
    updatedAt: Date.now()
  });

  // 2. Horse vs Horse Better Finish Matchup
  if (runnersWithProb.length >= 2) {
    let bestPair = [runnersWithProb[0], runnersWithProb[1]];
    let minOddsDiff = Math.abs(bestPair[0].impliedProb - bestPair[1].impliedProb);

    for (let i = 0; i < runnersWithProb.length; i++) {
      for (let j = i + 1; j < runnersWithProb.length; j++) {
        const diff = Math.abs(runnersWithProb[i].impliedProb - runnersWithProb[j].impliedProb);
        if (diff < minOddsDiff) {
          minOddsDiff = diff;
          bestPair = [runnersWithProb[i], runnersWithProb[j]];
        }
      }
    }

    const [horse1, horse2] = bestPair;
    const pos1 = horse1.finishPosition;
    const pos2 = horse2.finishPosition;

    let h1Score = 0;
    let h2Score = 0;
    let h2hWinnerId: string | undefined = undefined;

    if (pos1 && pos2) {
      if (pos1 < pos2) {
        h1Score = 1;
        h2hWinnerId = `horse_${horse1.programNumber || '1'}`;
      } else if (pos2 < pos1) {
        h2Score = 1;
        h2hWinnerId = `horse_${horse2.programNumber || '2'}`;
      }
    }

    const h2hGameId = `equibase_${card.raceId}_h2h`;
    matchups.push({
      gameId: h2hGameId,
      title: `${card.trackName} R${card.raceNumber}: ${horse1.horseName} vs ${horse2.horseName}`,
      league: 'HORSE_RACING',
      startTime: card.postTimeMs,
      status: card.status,
      active: true,
      manuallyActivated: true,
      type: 'STANDARD',
      homeTeam: {
        id: `horse_${horse1.programNumber || '1'}`,
        name: `${horse1.horseName} (${horse1.morningLineOdds || 'ML'})`,
        image: '/logo.png',
        score: h1Score
      },
      awayTeam: {
        id: `horse_${horse2.programNumber || '2'}`,
        name: `${horse2.horseName} (${horse2.morningLineOdds || 'ML'})`,
        image: '/logo.png',
        score: h2Score
      },
      winnerId: card.status === 'STATUS_FINAL' ? h2hWinnerId : undefined,
      metadata: {
        matchupType: 'HORSE_VS_HORSE',
        trackName: card.trackName,
        trackCode: card.trackCode,
        raceNumber: card.raceNumber,
        raceDate: card.raceDate,
        horse1ImpliedProb: Math.round(horse1.impliedProb * 100) / 100,
        horse2ImpliedProb: Math.round(horse2.impliedProb * 100) / 100,
        horse1,
        horse2,
        winningHorse: card.winningHorse || null
      },
      updatedAt: Date.now()
    });
  }

  return matchups;
}

/**
 * Executes the Apify Equibase US Horse Racing Scraper actor and returns parsed race cards.
 */
export async function fetchEquibaseScraperData(options: ApifyRunOptions = {}): Promise<{
  success: boolean;
  cards: EquibaseRaceCard[];
  datasetId?: string;
  error?: string;
}> {
  const token = getApifyToken();
  if (!token) {
    return {
      success: false,
      cards: [],
      error: 'APIFY_API_TOKEN is missing or unconfigured.'
    };
  }

  try {
    let url: string;
    let method = 'GET';
    let body: string | undefined = undefined;

    if (options.datasetId) {
      // Fetch directly from existing dataset ID
      url = `https://api.apify.com/v2/datasets/${options.datasetId}/items?token=${token}`;
    } else {
      // Trigger synchronous actor run and fetch dataset items
      url = `https://api.apify.com/v2/acts/${EQUIBASE_ACTOR_ID}/run-sync-get-dataset-items?token=${token}`;
      method = 'POST';
      const targetDate = options.date || options.raceDate || new Date().toISOString().split('T')[0];
      const targetTracks = (options.tracks && options.tracks.length > 0) ? options.tracks : (options.trackCodes && options.trackCodes.length > 0 ? options.trackCodes : undefined);
      const intendedUsage = options.sp_intended_usage || options.spIntendedUsage || 'Automated horse racing odds and race cards ingestion for ChainLink sports platform';
      const improvementSuggestions = options.sp_improvement_suggestions || options.spImprovementSuggestions || 'None';
      const contact = options.sp_contact || options.spContact || 'admin@chainlink.club';

      body = JSON.stringify({
        date: targetDate,
        raceDate: targetDate,
        tracks: targetTracks,
        trackCodes: targetTracks,
        dataMode: options.dataMode || 'both',
        maxItems: options.maxItems || 100,
        sp_intended_usage: intendedUsage,
        sp_improvement_suggestions: improvementSuggestions,
        sp_contact: contact
      });
    }

    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json'
      },
      body
    });

    if (!res.ok) {
      const errorText = await res.text();
      return {
        success: false,
        cards: [],
        error: `Apify API returned HTTP ${res.status}: ${errorText.slice(0, 200)}`
      };
    }

    const items = await res.json();
    const rawItems = Array.isArray(items) ? items : (items.data?.items || items.items || []);
    const cards = parseEquibaseItems(rawItems);

    return {
      success: true,
      cards,
      datasetId: options.datasetId
    };
  } catch (e: any) {
    console.error('Error executing Apify Equibase scraper:', e);
    return {
      success: false,
      cards: [],
      error: e.message || 'Failed to communicate with Apify API.'
    };
  }
}

/**
 * Persists parsed Equibase race cards as ChainLink matchups in Firestore.
 */
export async function syncEquibaseRacesToMatchups(db: any, cards: EquibaseRaceCard[]): Promise<{
  syncedCount: number;
  updatedGameIds: string[];
}> {
  if (!db || !Array.isArray(cards) || cards.length === 0) {
    return { syncedCount: 0, updatedGameIds: [] };
  }

  const updatedGameIds: string[] = [];

  for (const card of cards) {
    // 1. Primary Full Race Matchup
    const gameId = `equibase_${card.raceId}`;
    const docRef = db.collection('matchups').doc(gameId);
    const existingDoc = await docRef.get();

    const activeRunners = card.runners.filter(r => r.status !== 'SCRATCHED');
    const firstRunner = activeRunners[0] || { horseName: 'Runner 1', programNumber: '1' };
    const secondRunner = activeRunners[1] || { horseName: 'Runner 2', programNumber: '2' };

    const homeScore = (firstRunner.finishPosition === 1 || card.winningHorse === firstRunner.horseName) ? 1 : 0;
    const awayScore = (secondRunner.finishPosition === 1 || card.winningHorse === secondRunner.horseName) ? 1 : 0;

    const matchupData: any = {
      gameId,
      title: `${card.trackName} - Race ${card.raceNumber}`,
      league: 'HORSE_RACING',
      startTime: card.postTimeMs,
      status: card.status,
      active: true,
      manuallyActivated: true,
      type: 'STANDARD',
      homeTeam: {
        id: `program_${firstRunner.programNumber || '1'}`,
        name: firstRunner.horseName,
        image: '/logo.png',
        score: homeScore
      },
      awayTeam: {
        id: `program_${secondRunner.programNumber || '2'}`,
        name: secondRunner.horseName,
        image: '/logo.png',
        score: awayScore
      },
      metadata: {
        trackName: card.trackName,
        trackCode: card.trackCode,
        raceNumber: card.raceNumber,
        raceDate: card.raceDate,
        distance: card.distance,
        surface: card.surface,
        purse: card.purse,
        runners: card.runners,
        winningHorse: card.winningHorse || null,
        winningProgramNumber: card.winningProgramNumber || null
      },
      updatedAt: Date.now()
    };

    if (!existingDoc.exists) {
      matchupData.createdAt = Date.now();
    }

    if (card.winningHorse) {
      matchupData.winnerId = card.winningHorse;
    }

    await docRef.set(matchupData, { merge: true });
    updatedGameIds.push(gameId);

    // 2. Generate and store balanced Horse vs Field & Horse vs Horse Matchups
    const balancedMatchups = generateBalancedHorseRacingMatchups(card);
    for (const bm of balancedMatchups) {
      const bmRef = db.collection('matchups').doc(bm.gameId);
      const bmExisting = await bmRef.get();
      if (!bmExisting.exists) {
        bm.createdAt = Date.now();
      }
      await bmRef.set(bm, { merge: true });
      updatedGameIds.push(bm.gameId);
    }
  }

  return {
    syncedCount: updatedGameIds.length,
    updatedGameIds
  };
}

/**
 * Purges (marks inactive and abandoned) horse racing matchups whose post time has arrived or passed if no user picks exist.
 */
export async function purgeUnpickedHorseMatchups(db: any, now: number = Date.now()): Promise<{
  purgedCount: number;
  purgedGameIds: string[];
}> {
  if (!db) return { purgedCount: 0, purgedGameIds: [] };

  try {
    const horseMatchupsSnap = await db.collection('matchups')
      .where('league', '==', 'HORSE_RACING')
      .where('active', '==', true)
      .get();

    const purgedGameIds: string[] = [];

    for (const doc of horseMatchupsSnap.docs) {
      const data = doc.data();
      const startTime = parseRacePostTime(data.startTime);

      if (startTime > 0 && now >= startTime) {
        const gameId = data.gameId || doc.id;

        // Check if picks exist in main game 'picks' or 'pickemPicks'
        let hasPicks = false;

        const mainPicksSnap = await db.collection('picks')
          .where('gameId', '==', gameId)
          .limit(1)
          .get();

        if (!mainPicksSnap.empty) {
          hasPicks = true;
        } else {
          const pickemPicksSnap = await db.collection('pickemPicks')
            .where('matchupId', '==', gameId)
            .limit(1)
            .get();
          if (!pickemPicksSnap.empty) {
            hasPicks = true;
          }
        }

        if (!hasPicks) {
          await doc.ref.update({
            active: false,
            abandoned: true,
            updatedAt: now
          });
          purgedGameIds.push(gameId);
        }
      }
    }

    return {
      purgedCount: purgedGameIds.length,
      purgedGameIds
    };
  } catch (e) {
    console.error('Error purging unpicked horse matchups:', e);
    return { purgedCount: 0, purgedGameIds: [] };
  }
}

/**
 * Triggers daily schedule sync for today's horse racing slates and purges unpicked locked races.
 * Intended to run as part of daily/overnight automated ingestion.
 */
export async function runDailyHorseRacingScheduleSync(db: any, options: ApifyRunOptions = {}): Promise<{
  success: boolean;
  syncedCount: number;
  purgedCount: number;
  updatedGameIds: string[];
  error?: string;
}> {
  const targetDate = options.date || new Date().toISOString().split('T')[0];
  const fetchResult = await fetchEquibaseScraperData({
    date: targetDate,
    tracks: options.tracks,
    maxItems: options.maxItems || 200
  });

  if (!fetchResult.success) {
    return {
      success: false,
      syncedCount: 0,
      purgedCount: 0,
      updatedGameIds: [],
      error: fetchResult.error
    };
  }

  const syncResult = await syncEquibaseRacesToMatchups(db, fetchResult.cards);
  const purgeResult = await purgeUnpickedHorseMatchups(db);

  return {
    success: true,
    syncedCount: syncResult.syncedCount,
    purgedCount: purgeResult.purgedCount,
    updatedGameIds: syncResult.updatedGameIds
  };
}
