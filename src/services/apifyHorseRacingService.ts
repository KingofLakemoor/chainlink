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
  useLastRun?: boolean;
  forceRun?: boolean;
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
 * Recursively cleans an object/array payload for Firestore by replacing `undefined` values with `null`.
 */
export function cleanFirestorePayload<T>(obj: T): T {
  if (obj === undefined) {
    return null as any;
  }
  if (obj === null) {
    return null as any;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => cleanFirestorePayload(item)) as any;
  }
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value === undefined) {
        cleaned[key] = null;
      } else {
        cleaned[key] = cleanFirestorePayload(value);
      }
    }
    return cleaned as T;
  }
  return obj;
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
 * Helper to extract track name from various JSON shapes.
 */
function extractTrackName(item: any): string {
  if (!item || typeof item !== 'object') return 'Unknown Track';

  const subObj = item.raceCard || item.race_card || item.card || item.details || item.race || item.header || item.summary;

  const name =
    item.trackName ||
    item.track_name ||
    item.trackTitle ||
    item.track_title ||
    item.trackDisplayName ||
    item.track_display_name ||
    item.venue ||
    item.venueName ||
    item.venue_name ||
    item.racetrack ||
    item.raceTrack ||
    item.race_track ||
    item.location ||
    item.course ||
    item.courseName ||
    item.course_name ||
    (typeof item.track === 'string' ? item.track : null) ||
    item.trackCode ||
    item.track_code ||
    item.trackId ||
    item.track_id ||
    subObj?.trackName ||
    subObj?.track_name ||
    subObj?.trackTitle ||
    subObj?.venue ||
    subObj?.racetrack ||
    subObj?.course ||
    (typeof subObj?.track === 'string' ? subObj.track : null);

  if (typeof name === 'string' && name.trim()) {
    return name.trim();
  }
  if (typeof item.track === 'object' && item.track) {
    const nested = item.track.name || item.track.trackName || item.track.title || item.track.code;
    if (typeof nested === 'string' && nested.trim()) return nested.trim();
  }
  if (typeof subObj?.track === 'object' && subObj.track) {
    const nested = subObj.track.name || subObj.track.trackName || subObj.track.title || subObj.track.code;
    if (typeof nested === 'string' && nested.trim()) return nested.trim();
  }
  return 'Unknown Track';
}

/**
 * Helper to extract track code from various JSON shapes.
 */
function extractTrackCode(item: any, fallbackName: string): string {
  if (!item || typeof item !== 'object') return 'TRK';

  const subObj = item.raceCard || item.race_card || item.card || item.details || item.race || item.header || item.summary;

  const code =
    item.trackCode ||
    item.track_code ||
    item.trackId ||
    item.track_id ||
    item.track_abbr ||
    item.trackAbbr ||
    item.trackCodeAbbr ||
    item.track_code_abbr ||
    (typeof item.track === 'string' ? item.track : null) ||
    subObj?.trackCode ||
    subObj?.track_code ||
    subObj?.trackId ||
    subObj?.track_id ||
    subObj?.trackAbbr;

  if (typeof code === 'string' && code.trim().length >= 2 && code.trim().length <= 6) {
    return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  const sourceStr = (fallbackName && fallbackName !== 'Unknown Track' ? fallbackName : (typeof code === 'string' ? code : 'TRK'));
  return sourceStr.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5) || 'TRK';
}

/**
 * Helper to extract race number.
 */
function extractRaceNumber(item: any): number {
  if (!item || typeof item !== 'object') return 1;

  const raw =
    item.raceNumber ??
    item.race_number ??
    item.raceNum ??
    item.race_num ??
    item.raceNo ??
    item.race_no ??
    item.number ??
    item.num ??
    item.race_id ??
    item.raceId ??
    item.race;

  if (typeof raw === 'number' && !isNaN(raw)) {
    return raw;
  }
  if (typeof raw === 'string') {
    const match = raw.match(/(?:R|Race\s*|#)?(\d+)/i);
    if (match) {
      return parseInt(match[1], 10);
    }
  }
  if (typeof item.race === 'object' && item.race) {
    const nestedNum = item.race.number || item.race.raceNumber || item.race.num;
    if (typeof nestedNum === 'number' && !isNaN(nestedNum)) return nestedNum;
    if (typeof nestedNum === 'string') {
      const match = nestedNum.match(/\d+/);
      if (match) return parseInt(match[0], 10);
    }
  }
  return 1;
}

/**
 * Helper to extract horse name from runner object or string.
 */
function extractHorseName(r: any): string | null {
  if (!r) return null;
  if (typeof r === 'string' && r.trim()) return r.trim();

  if (typeof r === 'object') {
    const rawName =
      r.horseName ||
      r.horse_name ||
      r.horseTitle ||
      r.horse_title ||
      r.horseText ||
      r.horse_text ||
      r.runnerName ||
      r.runner_name ||
      r.entryName ||
      r.entry_name ||
      r.name ||
      r.title;

    if (typeof rawName === 'string' && rawName.trim()) {
      return rawName.trim();
    }

    if (typeof r.horse === 'string' && r.horse.trim()) {
      return r.horse.trim();
    }
    if (typeof r.horse === 'object' && r.horse) {
      const nested = r.horse.name || r.horse.horseName || r.horse.title;
      if (typeof nested === 'string' && nested.trim()) return nested.trim();
    }

    if (typeof r.runner === 'string' && r.runner.trim()) {
      return r.runner.trim();
    }
    if (typeof r.runner === 'object' && r.runner) {
      const nested = r.runner.name || r.runner.runnerName || r.runner.title;
      if (typeof nested === 'string' && nested.trim()) return nested.trim();
    }

    if (typeof r.starter === 'string' && r.starter.trim()) {
      return r.starter.trim();
    }
    if (typeof r.starter === 'object' && r.starter) {
      const nested = r.starter.name || r.starter.horseName;
      if (typeof nested === 'string' && nested.trim()) return nested.trim();
    }
  }

  return null;
}

/**
 * Helper to extract runners array from various JSON shapes.
 */
function extractRunnersArray(item: any): any[] {
  if (!item || typeof item !== 'object') return [];

  if (Array.isArray(item.runners) && item.runners.length > 0) return item.runners;
  if (Array.isArray(item.horses) && item.horses.length > 0) return item.horses;
  if (Array.isArray(item.entries) && item.entries.length > 0) return item.entries;
  if (Array.isArray(item.starters) && item.starters.length > 0) return item.starters;
  if (Array.isArray(item.contenders) && item.contenders.length > 0) return item.contenders;
  if (Array.isArray(item.field) && item.field.length > 0) return item.field;
  if (Array.isArray(item.competitors) && item.competitors.length > 0) return item.competitors;
  if (Array.isArray(item.participants) && item.participants.length > 0) return item.participants;
  if (Array.isArray(item.race_runners) && item.race_runners.length > 0) return item.race_runners;
  if (Array.isArray(item.raceRunners) && item.raceRunners.length > 0) return item.raceRunners;
  if (Array.isArray(item.results) && item.results.length > 0) return item.results;
  if (Array.isArray(item.items) && item.items.length > 0) return item.items;

  const subObj = item.race || item.raceCard || item.race_card || item.card || item.details;
  if (subObj && typeof subObj === 'object') {
    if (Array.isArray(subObj.runners) && subObj.runners.length > 0) return subObj.runners;
    if (Array.isArray(subObj.horses) && subObj.horses.length > 0) return subObj.horses;
    if (Array.isArray(subObj.entries) && subObj.entries.length > 0) return subObj.entries;
    if (Array.isArray(subObj.starters) && subObj.starters.length > 0) return subObj.starters;
    if (Array.isArray(subObj.results) && subObj.results.length > 0) return subObj.results;
  }

  return [];
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
    const trackName = extractTrackName(item);
    const trackCode = extractTrackCode(item, trackName);
    const raceNumber = extractRaceNumber(item);
    const dateStr = item.raceDate || item.race_date || item.date || item.eventDate || item.event_date || new Date().toISOString().split('T')[0];

    const raceKey = `${trackCode}_${dateStr.replace(/-/g, '')}_R${raceNumber}`;

    if (!raceMap.has(raceKey)) {
      const postTimeMs = parseRacePostTime(item.postTime || item.post_time || item.post_time_ms || item.time || item.startTime || item.start_time, dateStr);
      let raceStatus: EquibaseRaceCard['status'] = 'STATUS_SCHEDULED';

      const rawStatus = String(item.status || item.raceStatus || item.race_status || '').toUpperCase();
      if (rawStatus.includes('FINAL') || rawStatus.includes('OFFICIAL') || item.winningHorse || item.winning_horse || item.winner) {
        raceStatus = 'STATUS_FINAL';
      } else if (rawStatus.includes('RUNNING') || rawStatus.includes('IN_PROGRESS') || rawStatus.includes('LIVE')) {
        raceStatus = 'STATUS_IN_PROGRESS';
      } else if (rawStatus.includes('CANCEL')) {
        raceStatus = 'STATUS_CANCELLED';
      }

      const winHorseName = extractHorseName(item.winningHorse || item.winning_horse || item.winner);

      raceMap.set(raceKey, {
        raceId: raceKey,
        trackName,
        trackCode,
        raceNumber,
        raceDate: dateStr,
        postTimeMs,
        distance: item.distance || item.dist || null,
        surface: item.surface || null,
        purse: item.purse || null,
        status: raceStatus,
        runners: [],
        winningHorse: winHorseName || null,
        winningProgramNumber: item.winningProgramNumber || item.winning_program_number || item.winningProgram || item.winning_program || null,
        rawPayload: item || null
      });
    }

    const card = raceMap.get(raceKey)!;
    const runnersArray = extractRunnersArray(item);

    // Handle nested runners array
    if (runnersArray.length > 0) {
      for (const r of runnersArray) {
        const horseName = extractHorseName(r);
        if (!horseName) continue;
        const mlOdds = r.morningLineOdds ?? r.morning_line_odds ?? r.morningLine ?? r.morning_line ?? r.mlOdds ?? r.ml_odds ?? r.odds ?? r.ml;
        const rawFinishPos = r.finishPosition !== undefined ? Number(r.finishPosition) : (r.finish_position !== undefined ? Number(r.finish_position) : (r.finish !== undefined ? Number(r.finish) : undefined));
        const finishPos = rawFinishPos !== undefined && !isNaN(rawFinishPos) ? rawFinishPos : null;
        const programNum = r.programNumber ?? r.program_number ?? r.program ?? r.number ?? r.num ?? r.saddle ?? r.cloth ?? r.pp ?? r.postPosition ?? r.post_position ?? null;
        const postPos = (r.postPosition !== undefined && r.postPosition !== null && !isNaN(Number(r.postPosition))) ? Number(r.postPosition) : ((r.post_position !== undefined && r.post_position !== null && !isNaN(Number(r.post_position))) ? Number(r.post_position) : null);
        const isScr = Boolean(r.scratched || r.scratch || r.isScratched || r.is_scratched || String(r.status || '').toUpperCase().includes('SCRATCH'));

        card.runners.push({
          programNumber: programNum ? String(programNum).trim() : null,
          postPosition: postPos,
          horseName: horseName.trim(),
          jockey: r.jockey || r.jockeyName || r.jockey_name || null,
          trainer: r.trainer || r.trainerName || r.trainer_name || null,
          morningLineOdds: mlOdds !== null && mlOdds !== undefined ? String(mlOdds).trim() : null,
          mlOddsNumber: parseMorningLineOdds(mlOdds) ?? null,
          finishPosition: finishPos,
          status: isScr ? 'SCRATCHED' : (finishPos === 1 ? 'WINNER' : 'ACTIVE')
        });

        if (finishPos === 1 || r.status === 'WINNER') {
          card.winningHorse = horseName.trim();
          card.winningProgramNumber = programNum ? String(programNum).trim() : null;
          card.status = 'STATUS_FINAL';
        }
      }
    } else {
      // Handle flat runner item
      const horseName = extractHorseName(item);
      if (horseName) {
        const mlOdds = item.morningLineOdds ?? item.morning_line_odds ?? item.morningLine ?? item.morning_line ?? item.mlOdds ?? item.ml_odds ?? item.odds ?? item.ml;
        const rawFinishPos = item.finishPosition !== undefined ? Number(item.finishPosition) : (item.finish_position !== undefined ? Number(item.finish_position) : (item.finish !== undefined ? Number(item.finish) : undefined));
        const finishPos = rawFinishPos !== undefined && !isNaN(rawFinishPos) ? rawFinishPos : null;
        const programNum = item.programNumber ?? item.program_number ?? item.program ?? item.number ?? item.num ?? item.saddle ?? item.cloth ?? item.pp ?? item.postPosition ?? item.post_position ?? null;
        const postPos = (item.postPosition !== undefined && item.postPosition !== null && !isNaN(Number(item.postPosition))) ? Number(item.postPosition) : ((item.post_position !== undefined && item.post_position !== null && !isNaN(Number(item.post_position))) ? Number(item.post_position) : null);
        const isScr = Boolean(item.scratched || item.scratch || item.isScratched || item.is_scratched || String(item.status || '').toUpperCase().includes('SCRATCH'));

        card.runners.push({
          programNumber: programNum ? String(programNum).trim() : null,
          postPosition: postPos,
          horseName: horseName.trim(),
          jockey: item.jockey || item.jockeyName || item.jockey_name || null,
          trainer: item.trainer || item.trainerName || item.trainer_name || null,
          morningLineOdds: mlOdds !== null && mlOdds !== undefined ? String(mlOdds).trim() : null,
          mlOddsNumber: parseMorningLineOdds(mlOdds) ?? null,
          finishPosition: finishPos,
          status: isScr ? 'SCRATCHED' : (finishPos === 1 ? 'WINNER' : 'ACTIVE')
        });

        if (finishPos === 1 || item.status === 'WINNER') {
          card.winningHorse = horseName.trim();
          card.winningProgramNumber = programNum ? String(programNum).trim() : null;
          card.status = 'STATUS_FINAL';
        }
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

  const hvfWinnerId = card.status === 'STATUS_FINAL' ? (horseWon ? `horse_${bestFieldHorse.programNumber || '1'}` : (fieldWon ? 'field' : null)) : null;

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
    winnerId: hvfWinnerId,
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
    let h2hWinnerId: string | null = null;

    if (pos1 && pos2) {
      if (pos1 < pos2) {
        h1Score = 1;
        h2hWinnerId = `horse_${horse1.programNumber || '1'}`;
      } else if (pos2 < pos1) {
        h2Score = 1;
        h2hWinnerId = `horse_${horse2.programNumber || '2'}`;
      }
    }

    const finalH2HWinnerId = card.status === 'STATUS_FINAL' ? h2hWinnerId : null;

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
      winnerId: finalH2HWinnerId,
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
  source?: 'dataset' | 'lastRunDataset' | 'newRun';
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

  // Helper to extract items array from various Apify response shapes
  const extractItemsFromResponse = (parsed: any): any[] => {
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed?.items)) return parsed.items;
    if (Array.isArray(parsed?.data?.items)) return parsed.data.items;
    if (Array.isArray(parsed?.data)) return parsed.data;
    return [];
  };

  try {
    // 1. Fetch directly from specified Dataset ID ($0.00)
    if (options.datasetId) {
      const url = `https://api.apify.com/v2/datasets/${options.datasetId}/items?clean=true&token=${token}`;
      const res = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
      if (!res.ok) {
        const errorText = await res.text();
        return {
          success: false,
          cards: [],
          error: `Apify Dataset API returned HTTP ${res.status}: ${errorText.slice(0, 200)}`
        };
      }
      const parsed = await res.json();
      const rawItems = extractItemsFromResponse(parsed);
      const cards = parseEquibaseItems(rawItems);
      return {
        success: true,
        cards,
        datasetId: options.datasetId,
        source: 'dataset'
      };
    }

    // 2. Fetch dataset items from last actor run ($0.00) unless forceRun is true
    const shouldTryLastRun = options.useLastRun || (!options.forceRun && options.useLastRun !== false);

    if (shouldTryLastRun) {
      try {
        const lastRunUrl = `https://api.apify.com/v2/acts/${EQUIBASE_ACTOR_ID}/runs/last/dataset/items?clean=true&token=${token}`;
        const res = await fetch(lastRunUrl, { method: 'GET', headers: { 'Content-Type': 'application/json' } });

        if (res.ok) {
          const parsed = await res.json();
          const rawItems = extractItemsFromResponse(parsed);
          const cards = parseEquibaseItems(rawItems);

          if (cards.length > 0) {
            return {
              success: true,
              cards,
              source: 'lastRunDataset'
            };
          }
        }
      } catch (err) {
        console.warn('Failed to fetch dataset items from last actor run, falling back to new run if permitted:', err);
      }
    }

    // If options.useLastRun was explicitly true and forceRun is false, don't trigger new paid run if last run failed
    if (options.useLastRun && !options.forceRun) {
      return {
        success: false,
        cards: [],
        error: 'No dataset items found in last actor run.'
      };
    }

    // 3. Trigger new synchronous actor run (~$0.27)
    const runUrl = `https://api.apify.com/v2/acts/${EQUIBASE_ACTOR_ID}/run-sync-get-dataset-items?token=${token}`;
    const targetDate = options.date || options.raceDate || new Date().toISOString().split('T')[0];
    const targetTracks = (options.tracks && options.tracks.length > 0) ? options.tracks : (options.trackCodes && options.trackCodes.length > 0 ? options.trackCodes : undefined);
    const intendedUsage = options.sp_intended_usage || options.spIntendedUsage || 'Automated horse racing odds and race cards ingestion for ChainLink sports platform';
    const improvementSuggestions = options.sp_improvement_suggestions || options.spImprovementSuggestions || 'None';
    const contact = options.sp_contact || options.spContact || 'admin@chainlink.club';

    const body = JSON.stringify({
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

    const res = await fetch(runUrl, {
      method: 'POST',
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
        error: `Apify Actor Run API returned HTTP ${res.status}: ${errorText.slice(0, 200)}`
      };
    }

    const parsed = await res.json();
    const rawItems = extractItemsFromResponse(parsed);
    const cards = parseEquibaseItems(rawItems);

    return {
      success: true,
      cards,
      source: 'newRun'
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
    const activeRunners = card.runners.filter(r => r.status !== 'SCRATCHED');
    if (activeRunners.length === 0) {
      // Skip race cards with no active runners/horses
      continue;
    }

    // 1. Primary Full Race Matchup
    const gameId = `equibase_${card.raceId}`;
    const docRef = db.collection('matchups').doc(gameId);
    const existingDoc = await docRef.get();

    const firstRunner = activeRunners[0];
    const secondRunner = activeRunners[1] || { horseName: 'The Field', programNumber: 'FIELD', morningLineOdds: null };

    const homeScore = (firstRunner.finishPosition === 1 || card.winningHorse === firstRunner.horseName) ? 1 : 0;
    const awayScore = (secondRunner.finishPosition === 1 || card.winningHorse === secondRunner.horseName) ? 1 : 0;

    const firstHorseName = firstRunner.horseName || 'Contender 1';
    const secondHorseName = secondRunner.horseName || 'The Field';

    const firstHorseML = firstRunner.morningLineOdds ? ` (${firstRunner.morningLineOdds})` : '';
    const secondHorseML = secondRunner.morningLineOdds ? ` (${secondRunner.morningLineOdds})` : '';

    const matchupData: any = {
      gameId,
      title: `${card.trackName} R${card.raceNumber}: ${firstHorseName} vs ${secondHorseName}`,
      league: 'HORSE_RACING',
      startTime: card.postTimeMs,
      status: card.status,
      active: true,
      manuallyActivated: true,
      type: 'STANDARD',
      homeTeam: {
        id: `program_${firstRunner.programNumber || '1'}`,
        name: `${firstHorseName}${firstHorseML}`,
        image: '/logo.png',
        score: homeScore
      },
      awayTeam: {
        id: `program_${secondRunner.programNumber || '2'}`,
        name: `${secondHorseName}${secondHorseML}`,
        image: '/logo.png',
        score: awayScore
      },
      metadata: {
        trackName: card.trackName,
        trackCode: card.trackCode,
        raceNumber: card.raceNumber,
        raceDate: card.raceDate,
        distance: card.distance || null,
        surface: card.surface || null,
        purse: card.purse || null,
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

    const cleanedMatchupData = cleanFirestorePayload(matchupData);
    await docRef.set(cleanedMatchupData, { merge: true });
    updatedGameIds.push(gameId);

    // 2. Generate and store balanced Horse vs Field & Horse vs Horse Matchups
    const balancedMatchups = generateBalancedHorseRacingMatchups(card);
    for (const bm of balancedMatchups) {
      const bmRef = db.collection('matchups').doc(bm.gameId);
      const bmExisting = await bmRef.get();
      if (!bmExisting.exists) {
        bm.createdAt = Date.now();
      }
      const cleanedBm = cleanFirestorePayload(bm);
      await bmRef.set(cleanedBm, { merge: true });
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
