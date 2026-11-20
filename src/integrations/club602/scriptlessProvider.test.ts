import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ScriptlessScheduleProvider,
  defaultScriptlessProvider,
} from './scriptlessProvider';
import {
  getScheduleEndpoints,
  fetchScheduleData,
  scrapeLeagueSchedules,
  registerScheduleProvider,
  unregisterScheduleProvider,
  getScheduleProvider,
} from '../../services/espnScraper';
import { IScheduleProvider } from '../../types/providers';

describe('Option E: ScriptlessScheduleProvider and Pluggable IScheduleProvider', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('ScriptlessScheduleProvider implements IScheduleProvider contract', () => {
    const provider = new ScriptlessScheduleProvider({
      baseUrl: 'https://custom.club602.com',
      apiKey: 'test-key-123',
    });

    expect(provider.league).toBe('SCRIPTLESS');
    const endpoints = provider.getEndpoints();
    expect(endpoints).toEqual(['https://custom.club602.com/api/chainlink/matchups']);
  });

  it('ScriptlessScheduleProvider correctly parses raw ScriptLessPayload into ScrapedMatchup', () => {
    const provider = new ScriptlessScheduleProvider();
    const rawPayload = {
      eventId: 'evt_darts_101',
      name: 'Championship Round',
      league: 'SCRIPTLESS',
      startTime: '2026-11-20T20:00:00Z',
      status: 'STATUS_SCHEDULED',
      homeTeam: { name: 'Player A', logo: '/img/a.png', score: 0 },
      awayTeam: { name: 'Player B', logo: '/img/b.png', score: 0 },
      metadata: { venue: 'Main Stage' },
    };

    const parsed = provider.parseMatchup(rawPayload);
    expect(parsed).not.toBeNull();
    expect(parsed?.gameId).toBe('evt_darts_101');
    expect(parsed?.title).toBe('Championship Round');
    expect(parsed?.active).toBe(true);
    expect(parsed?.status).toBe('STATUS_SCHEDULED');
    expect(parsed?.statusDesc).toBe('Upcoming');
    expect(parsed?.featuredType).toBe('ScriptLess');
    expect(parsed?.homeTeam.name).toBe('Player A');
    expect(parsed?.awayTeam.name).toBe('Player B');
    expect(parsed?.metadata?.venue).toBe('Main Stage');
  });

  it('ScriptlessScheduleProvider handles STATUS_FINAL status mapping correctly', () => {
    const provider = new ScriptlessScheduleProvider();
    const rawPayload = {
      eventId: 'evt_final_202',
      name: 'Final Round',
      startTime: '2026-11-20T18:00:00Z',
      status: 'STATUS_FINAL',
      homeTeam: { name: 'Winner', logo: '', score: 5 },
      awayTeam: { name: 'Runner Up', logo: '', score: 3 },
    };

    const parsed = provider.parseMatchup(rawPayload);
    expect(parsed?.active).toBe(false);
    expect(parsed?.status).toBe('STATUS_FINAL');
    expect(parsed?.statusDesc).toBe('Final');
    expect(parsed?.homeTeam.score).toBe(5);
  });

  it('getScheduleEndpoints delegates to custom provider for SCRIPTLESS', () => {
    const endpoints = getScheduleEndpoints('SCRIPTLESS', false);
    expect(endpoints).toEqual(['https://scriptless.club602.com/api/chainlink/matchups']);
  });

  it('allows registering a mock custom schedule provider for a new open-source league', async () => {
    const mockCustomLeagueProvider: IScheduleProvider = {
      league: 'COMMUNITY_PICKEM',
      getEndpoints: () => ['https://api.community.org/schedule'],
      fetchScheduleData: async () => ({
        games_list: {
          games: [
            {
              id: 'comm_1',
              title: 'Team X vs Team Y',
              time: '2026-11-20T22:00:00Z',
            },
          ],
        },
      }),
      parseMatchup: (raw: any) => ({
        gameId: raw.id,
        startTime: new Date(raw.time).getTime(),
        active: true,
        title: raw.title,
        league: 'COMMUNITY_PICKEM',
        status: 'STATUS_SCHEDULED',
        statusDesc: 'Upcoming',
        type: 'SCORE',
        homeTeam: { id: 'Team Y', name: 'Team Y', image: '/y.png', score: 0 },
        awayTeam: { id: 'Team X', name: 'Team X', image: '/x.png', score: 0 },
      }),
    };

    registerScheduleProvider(mockCustomLeagueProvider);
    expect(getScheduleProvider('COMMUNITY_PICKEM')).toBe(mockCustomLeagueProvider);

    const endpoints = getScheduleEndpoints('COMMUNITY_PICKEM', false);
    expect(endpoints).toEqual(['https://api.community.org/schedule']);

    const scheduleData = await fetchScheduleData('https://api.community.org/schedule', 'COMMUNITY_PICKEM');
    expect(scheduleData.games_list.games[0].id).toBe('comm_1');

    const result = await scrapeLeagueSchedules('COMMUNITY_PICKEM', false);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].gameId).toBe('comm_1');
    expect(result.data[0].title).toBe('Team X vs Team Y');

    // Clean up
    unregisterScheduleProvider('COMMUNITY_PICKEM');
    expect(getScheduleProvider('COMMUNITY_PICKEM')).toBeUndefined();
  });

  it('scrapeLeagueSchedules processes SCRIPTLESS using ScriptlessScheduleProvider and fetch', async () => {
    const mockApiResponse = {
      matchups: [
        {
          eventId: 'scriptless_live_1',
          name: 'Main Event Finals',
          league: 'SCRIPTLESS',
          startTime: '2026-11-20T21:00:00Z',
          status: 'STATUS_IN_PROGRESS',
          homeTeam: { name: 'Player One', logo: '/img/1.png', score: 1 },
          awayTeam: { name: 'Player Two', logo: '/img/2.png', score: 2 },
          metadata: { round: 'Semifinals' },
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockApiResponse,
    } as any);

    const result = await scrapeLeagueSchedules('SCRIPTLESS', false);
    expect(result.error).toBeFalsy();
    expect(result.data).toHaveLength(1);
    expect(result.data[0].gameId).toBe('scriptless_live_1');
    expect(result.data[0].status).toBe('STATUS_IN_PROGRESS');
    expect(result.data[0].statusDesc).toBe('In Progress');
    expect(result.data[0].homeTeam.score).toBe(1);
    expect(result.data[0].awayTeam.score).toBe(2);
  });
});
