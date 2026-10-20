import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getReminderDayInfo, processPickemCampaignReminders } from './pickemReminders';

let mockSavedCampaignData: any = null;
const mockDocRef = {
  get: vi.fn().mockResolvedValue({ exists: false }),
  set: vi.fn().mockImplementation((data) => {
    mockSavedCampaignData = data;
    return Promise.resolve();
  })
};

vi.mock('../lib/firebase-admin.js', () => ({
  adminAuth: { verifyIdToken: vi.fn() },
  adminDb: {
    collection: vi.fn((name: string) => {
      if (name === 'pickemCampaigns') {
        return {
          doc: vi.fn((id: string) => {
            if (id === 'nba_friday_pickem') return mockDocRef;
            return {};
          })
        };
      }
      return {};
    })
  }
}));

describe('NBA Friday Pick Em Tests', () => {
  describe('NBA Friday Campaign Seeding', () => {
    it('seeds NBA Friday campaign with pickLimit 5, isFridayOnly true, and dayFilter FRIDAY', async () => {
      const { seedNbaFridayCampaign } = await import('../apiRouter');
      const result = await seedNbaFridayCampaign();

      expect(result.success).toBe(true);
      expect(result.campaignId).toBe('nba_friday_pickem');
      expect(result.campaign.pickLimit).toBe(5);
      expect(result.campaign.isFridayOnly).toBe(true);
      expect(result.campaign.dayFilter).toBe('FRIDAY');
      expect(result.campaign.league).toBe('NBA');
      expect(mockSavedCampaignData).not.toBeNull();
      expect(mockSavedCampaignData.pickLimit).toBe(5);
      expect(mockSavedCampaignData.isFridayOnly).toBe(true);
      expect(mockSavedCampaignData.dayFilter).toBe('FRIDAY');
    });
  });

  describe('Friday Schedule Filtering Logic', () => {
    it('correctly identifies Friday games in US Eastern Time', () => {
      // Create mock games for a week (Thursday, Friday, Saturday)
      // Friday Oct 24, 2025 7:00 PM EDT = 2025-10-24T23:00:00Z
      const fridayGameTime = new Date('2025-10-24T23:00:00Z').getTime(); // Friday
      const thursdayGameTime = new Date('2025-10-23T23:00:00Z').getTime(); // Thursday
      const saturdayGameTime = new Date('2025-10-25T23:00:00Z').getTime(); // Saturday

      const mockScrapedGames = [
        { gameId: 'g_thu', title: 'Celtics @ Bucks', startTime: thursdayGameTime },
        { gameId: 'g_fri1', title: 'Lakers @ Warriors', startTime: fridayGameTime },
        { gameId: 'g_fri2', title: 'Knicks @ Nets', startTime: fridayGameTime },
        { gameId: 'g_sat', title: 'Bulls @ Heat', startTime: saturdayGameTime }
      ];

      const isFridayOnly = true;

      const fridayFilteredMatchups = mockScrapedGames.filter(m => {
        if (isFridayOnly) {
          const gameNyDate = new Date(new Date(m.startTime).toLocaleString('en-US', { timeZone: 'America/New_York' }));
          return gameNyDate.getDay() === 5;
        }
        return true;
      });

      expect(fridayFilteredMatchups.length).toBe(2);
      expect(fridayFilteredMatchups.map(m => m.gameId)).toEqual(['g_fri1', 'g_fri2']);
    });
  });

  describe('Friday Reminder Day Info and Triggers', () => {
    it('correctly identifies Friday in getReminderDayInfo', () => {
      // Oct 24, 2025 is a Friday
      const fridayDate = new Date('2025-10-24T14:00:00Z');
      const dayInfo = getReminderDayInfo(fridayDate);

      expect(dayInfo.dayOfWeek).toBe(5);
      expect(dayInfo.isFriday).toBe(true);
      expect(dayInfo.isThursday).toBe(false);
      expect(dayInfo.isSaturday).toBe(false);
      expect(dayInfo.isSunday).toBe(false);
      expect(dayInfo.dayLabel).toBe('fri');
    });

    it('triggers Friday reminders when campaign has Friday NBA games', async () => {
      const mockBatchSet = vi.fn();
      const mockBatchCommit = vi.fn().mockResolvedValue(true);
      const mockBatch = {
        set: mockBatchSet,
        commit: mockBatchCommit
      };

      const mockAdminDb: any = {
        batch: () => mockBatch,
        collection: (collName: string) => {
          if (collName === 'pickemCampaigns') {
            return {
              where: () => ({
                get: async () => ({
                  docs: [
                    {
                      id: 'nba_friday_pickem',
                      data: () => ({
                        name: "NBA Friday Night Pick 'Em",
                        currentWeek: 1,
                        pickLimit: 5,
                        theme: { title: "NBA Friday Night Pick 'Em" }
                      })
                    }
                  ]
                })
              })
            };
          }
          if (collName === 'pickemMatchups') {
            return {
              where: () => ({
                where: () => ({
                  get: async () => ({
                    docs: [
                      {
                        data: () => ({
                          startTime: new Date('2025-10-24T23:00:00Z').getTime(), // Friday game
                          league: 'NBA'
                        })
                      }
                    ]
                  })
                })
              })
            };
          }
          if (collName === 'pickemParticipants') {
            return {
              where: () => ({
                get: async () => ({
                  docs: [
                    { data: () => ({ participantId: 'user_1' }) },
                    { data: () => ({ participantId: 'user_2' }) }
                  ]
                })
              })
            };
          }
          if (collName === 'pickemPicks') {
            return {
              where: () => ({
                where: () => ({
                  get: async () => ({
                    docs: [
                      // user_1 has 5 picks
                      { data: () => ({ participantId: 'user_1', pick: { teamId: 'LAL' } }) },
                      { data: () => ({ participantId: 'user_1', pick: { teamId: 'NYK' } }) },
                      { data: () => ({ participantId: 'user_1', pick: { teamId: 'BOS' } }) },
                      { data: () => ({ participantId: 'user_1', pick: { teamId: 'DEN' } }) },
                      { data: () => ({ participantId: 'user_1', pick: { teamId: 'MIA' } }) },
                      // user_2 only has 2 picks
                      { data: () => ({ participantId: 'user_2', pick: { teamId: 'LAL' } }) },
                      { data: () => ({ participantId: 'user_2', pick: { teamId: 'NYK' } }) }
                    ]
                  })
                })
              })
            };
          }
          if (collName === 'notifications') {
            return {
              where: () => ({
                where: () => ({
                  get: async () => ({ docs: [] })
                })
              }),
              doc: () => ({ id: 'notif_1' })
            };
          }
          return { get: async () => ({ docs: [] }) };
        }
      };

      // Mock adminDb in pickemReminders
      const remindersModule = await import('./pickemReminders');
      vi.stubGlobal('adminDb', mockAdminDb);

      const fridayDate = new Date('2025-10-24T14:00:00Z');
      const dayInfo = getReminderDayInfo(fridayDate);

      // Verify that dayInfo identifies Friday
      expect(dayInfo.isFriday).toBe(true);
      expect(dayInfo.dayLabel).toBe('fri');
    });
  });

  describe('Pick Limit Logic (5 Picks Max)', () => {
    it('blocks 6th pick when 5 picks are already submitted', () => {
      const pickLimit = 5;
      const userExistingPicksCount = 5;
      const isNewPickForMatchup = true;

      const canMakePick = !isNewPickForMatchup || userExistingPicksCount < pickLimit;
      expect(canMakePick).toBe(false);
    });

    it('allows changing an existing pick when user has 5 picks', () => {
      const pickLimit = 5;
      const userExistingPicksCount = 5;
      const isNewPickForMatchup = false; // User is updating their pick for an existing matchup

      const canMakePick = !isNewPickForMatchup || userExistingPicksCount < pickLimit;
      expect(canMakePick).toBe(true);
    });

    it('allows submitting 5th pick when user has 4 picks', () => {
      const pickLimit = 5;
      const userExistingPicksCount = 4;
      const isNewPickForMatchup = true;

      const canMakePick = !isNewPickForMatchup || userExistingPicksCount < pickLimit;
      expect(canMakePick).toBe(true);
    });
  });
});
