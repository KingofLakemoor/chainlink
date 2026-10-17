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
  tracks?: string[];
  maxItems?: number;
  datasetId?: string;
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
      body = JSON.stringify({
        date: options.date || new Date().toISOString().split('T')[0],
        tracks: options.tracks && options.tracks.length > 0 ? options.tracks : undefined,
        maxItems: options.maxItems || 100
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
    const gameId = `equibase_${card.raceId}`;
    const docRef = db.collection('matchups').doc(gameId);
    const existingDoc = await docRef.get();

    // Pick top two contenders or default runners
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
  }

  return {
    syncedCount: updatedGameIds.length,
    updatedGameIds
  };
}
