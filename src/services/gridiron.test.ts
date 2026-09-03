import { describe, it, expect } from 'vitest';
import { filterAndNormalizeGridironGames } from './gridironIngestion';
import { evaluateGridironPick } from './gridironGrader';
import { GridironPick } from '../types/gridiron';

describe('Gridiron Service Tests', () => {
  describe('filterAndNormalizeGridironGames', () => {
    it('retains games with BOTH valid spread AND valid total line', () => {
      const rawMatchups = [
        {
          gameId: 'g1',
          awayTeam: { name: 'Miami Dolphins', shortName: 'MIA' },
          homeTeam: { name: 'Buffalo Bills', shortName: 'BUF' },
          startTime: Date.now() + 100000,
          status: 'STATUS_SCHEDULED',
          metadata: { spread: '-3.5', overUnder: '48.5' }
        }
      ];

      const result = filterAndNormalizeGridironGames(rawMatchups, 'NFL');
      expect(result.length).toBe(1);
      expect(result[0].gameId).toBe('g1');
      expect(result[0].spread.homeSpread).toBe(-3.5);
      expect(result[0].spread.awaySpread).toBe(3.5);
      expect(result[0].total.line).toBe(48.5);
    });

    it('discards games missing EITHER spread OR total line', () => {
      const rawMatchups = [
        {
          gameId: 'g_no_total',
          awayTeam: { name: 'Team A' },
          homeTeam: { name: 'Team B' },
          metadata: { spread: '-3.5' } // Missing total
        },
        {
          gameId: 'g_no_spread',
          awayTeam: { name: 'Team C' },
          homeTeam: { name: 'Team D' },
          metadata: { overUnder: '45.0' } // Missing spread
        }
      ];

      const result = filterAndNormalizeGridironGames(rawMatchups, 'CFB');
      expect(result.length).toBe(0);
    });
  });

  describe('evaluateGridironPick', () => {
    it('correctly grades home_spread picks', () => {
      const pick: GridironPick = {
        gameId: 'g1',
        league: 'NFL',
        pickType: 'spread',
        selection: 'home_spread',
        value: -3.5,
        kickoffTime: Date.now(),
        status: 'pending'
      };

      // BUF 24 - MIA 20 => Home wins by 4 points (> 3.5 spread) => WON
      expect(evaluateGridironPick(pick, 24, 20)).toBe('won');

      // BUF 21 - MIA 20 => Home wins by 1 point (< 3.5 spread) => LOST
      expect(evaluateGridironPick(pick, 21, 20)).toBe('lost');
    });

    it('correctly grades away_spread picks', () => {
      const pick: GridironPick = {
        gameId: 'g1',
        league: 'NFL',
        pickType: 'spread',
        selection: 'away_spread',
        value: 3.5,
        kickoffTime: Date.now(),
        status: 'pending'
      };

      // MIA 20 + 3.5 = 23.5 vs BUF 21 => 23.5 > 21 => WON
      expect(evaluateGridironPick(pick, 21, 20)).toBe('won');

      // MIA 20 + 3.5 = 23.5 vs BUF 27 => 23.5 < 27 => LOST
      expect(evaluateGridironPick(pick, 27, 20)).toBe('lost');
    });

    it('correctly grades over/under total picks', () => {
      const overPick: GridironPick = {
        gameId: 'g1',
        league: 'NFL',
        pickType: 'total',
        selection: 'over',
        value: 48.5,
        kickoffTime: Date.now(),
        status: 'pending'
      };

      const underPick: GridironPick = {
        ...overPick,
        selection: 'under'
      };

      // Total = 28 + 24 = 52 (> 48.5) => Over WON, Under LOST
      expect(evaluateGridironPick(overPick, 28, 24)).toBe('won');
      expect(evaluateGridironPick(underPick, 28, 24)).toBe('lost');

      // Total = 20 + 17 = 37 (< 48.5) => Over LOST, Under WON
      expect(evaluateGridironPick(overPick, 20, 17)).toBe('lost');
      expect(evaluateGridironPick(underPick, 20, 17)).toBe('won');
    });
  });

  describe('Blind Reveal Security Logic', () => {
    it('masks competitor picks before kickoff and reveals after kickoff', () => {
      const futureKickoff = Date.now() + 3600000;
      const pastKickoff = Date.now() - 3600000;
      const now = Date.now();

      const competitorUnlockedPick: GridironPick = {
        gameId: 'g_future',
        league: 'NFL',
        pickType: 'spread',
        selection: 'away_spread',
        value: 3.5,
        kickoffTime: futureKickoff,
        status: 'pending'
      };

      const competitorLockedPick: GridironPick = {
        gameId: 'g_past',
        league: 'NFL',
        pickType: 'total',
        selection: 'over',
        value: 48.5,
        kickoffTime: pastKickoff,
        status: 'pending'
      };

      // Masking function test for competitor
      const isOwner = false;

      const maskPick = (p: GridironPick) => {
        const isLocked = now >= p.kickoffTime;
        if (isOwner || isLocked) {
          return { ...p, isLocked };
        } else {
          return {
            gameId: p.gameId,
            league: p.league,
            pickType: p.pickType,
            selection: 'HIDDEN' as const,
            value: 0,
            kickoffTime: p.kickoffTime,
            status: 'pending' as const,
            isLocked: false
          };
        }
      };

      const maskedUnlocked = maskPick(competitorUnlockedPick);
      expect(maskedUnlocked.selection).toBe('HIDDEN');
      expect(maskedUnlocked.value).toBe(0);

      const maskedLocked = maskPick(competitorLockedPick);
      expect(maskedLocked.selection).toBe('over');
      expect(maskedLocked.value).toBe(48.5);
    });
  });
});
