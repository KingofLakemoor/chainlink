import { IScheduleProvider, ScrapedMatchup } from '../../types/providers.js';
import { ScriptLessPayload } from '../../types/scriptless.js';

export interface ScriptlessProviderConfig {
  baseUrl?: string;
  apiKey?: string;
  defaultLogo?: string;
}

/**
 * Proprietary Club 602 Grassroots Provider for the ScriptLess league.
 * Implements IScheduleProvider to decouple Club 602 API URLs and parsing
 * from the open-source ESPN schedule ingestion service.
 */
export class ScriptlessScheduleProvider implements IScheduleProvider {
  readonly league = 'SCRIPTLESS';
  private baseUrl: string;
  private apiKey?: string;
  private defaultLogo: string;

  constructor(config: ScriptlessProviderConfig = {}) {
    this.baseUrl = (
      config.baseUrl ||
      process.env.SCRIPTLESS_API_URL ||
      'https://scriptless.club602.com'
    ).replace(/\/+$/, '');
    this.apiKey = config.apiKey || process.env.SCRIPTLESS_API_KEY;
    this.defaultLogo = config.defaultLogo || '/images/scriptless.png';
  }

  getEndpoints(_options: { scoreboardOnly?: boolean; specificDates?: string[] } = {}): string[] {
    return [`${this.baseUrl}/api/chainlink/matchups`];
  }

  async fetchScheduleData(endpoint: string): Promise<any> {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };
    if (this.apiKey) {
      headers['x-api-key'] = this.apiKey;
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(endpoint, {
      headers,
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`[ScriptlessScheduleProvider] HTTP ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const matchups = data.matchups || (Array.isArray(data) ? data : []);
    return {
      scriptless: { games: matchups }
    };
  }

  parseMatchup(rawItem: any): ScrapedMatchup | null {
    if (!rawItem) return null;
    const sm = rawItem as ScriptLessPayload;
    const eventId = sm.eventId || (rawItem as any).id;
    if (!eventId) return null;

    const finalStatus = sm.status || 'STATUS_SCHEDULED';
    const finalStatusDesc =
      finalStatus === 'STATUS_SCHEDULED'
        ? 'Upcoming'
        : finalStatus === 'STATUS_FINAL'
        ? 'Final'
        : 'In Progress';

    return {
      gameId: eventId,
      startTime: new Date(sm.startTime).getTime(),
      active: finalStatus === 'STATUS_SCHEDULED',
      featured: true,
      featuredType: 'ScriptLess',
      title: sm.name || `${sm.awayTeam?.name || 'Away'} vs ${sm.homeTeam?.name || 'Home'}`,
      league: sm.league || 'SCRIPTLESS',
      status: finalStatus,
      statusDesc: finalStatusDesc,
      type: 'SCORE',
      homeTeam: {
        id: sm.homeTeam?.name || 'Home',
        name: sm.homeTeam?.name || 'Home',
        image: sm.homeTeam?.logo || this.defaultLogo,
        score: sm.homeTeam?.score || 0,
      },
      awayTeam: {
        id: sm.awayTeam?.name || 'Away',
        name: sm.awayTeam?.name || 'Away',
        image: sm.awayTeam?.logo || this.defaultLogo,
        score: sm.awayTeam?.score || 0,
      },
      metadata: sm.metadata || {},
    };
  }
}

/** Global default provider instance */
export const defaultScriptlessProvider = new ScriptlessScheduleProvider();
