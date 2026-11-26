import { describe, it, expect } from 'vitest';
import { isMatchupLocked, getMatchupStartTime, extractOverUnderLine, getPropPlayerOrSubject, getPropTargetLine, getPropScoringCategory, resolveOddsThresholds, evaluateOddsMatchupStatus } from './matchupUtils';

describe('matchupUtils', () => {
  describe('getMatchupStartTime', () => {
    it('parses numeric timestamps', () => {
      expect(getMatchupStartTime(1700000000000)).toBe(1700000000000);
    });

    it('parses Firestore Timestamp objects', () => {
      expect(getMatchupStartTime({ seconds: 1700000000, nanoseconds: 0 })).toBe(1700000000000);
      expect(getMatchupStartTime({ _seconds: 1700000000, _nanoseconds: 0 })).toBe(1700000000000);
      expect(getMatchupStartTime({ toMillis: () => 1700000000000 })).toBe(1700000000000);
    });

    it('parses ISO date strings', () => {
      const iso = '2026-11-24T20:00:00.000Z';
      expect(getMatchupStartTime(iso)).toBe(new Date(iso).getTime());
    });
  });

  describe('isMatchupLocked', () => {
    const now = 1000000;

    it('returns false for scheduled future matchup', () => {
      const matchup = {
        status: 'STATUS_SCHEDULED',
        startTime: now + 50000
      };
      expect(isMatchupLocked(matchup, now)).toBe(false);
    });

    it('returns true when status is not STATUS_SCHEDULED', () => {
      expect(isMatchupLocked({ status: 'STATUS_IN_PROGRESS', startTime: now + 50000 }, now)).toBe(true);
      expect(isMatchupLocked({ status: 'STATUS_FINAL', startTime: now + 50000 }, now)).toBe(true);
      expect(isMatchupLocked({ status: 'STATUS_POSTPONED', startTime: now + 50000 }, now)).toBe(true);
    });

    it('returns true when startTime has arrived or passed', () => {
      expect(isMatchupLocked({ status: 'STATUS_SCHEDULED', startTime: now }, now)).toBe(true);
      expect(isMatchupLocked({ status: 'STATUS_SCHEDULED', startTime: now - 1000 }, now)).toBe(true);
    });

    it('locks player prop if optionAStatus or optionBStatus is in-progress or final', () => {
      const prop = {
        status: 'STATUS_SCHEDULED',
        startTime: now + 50000,
        metadata: {
          isPropMatchup: true,
          optionAStatus: 'STATUS_IN_PROGRESS',
          optionBStatus: 'STATUS_SCHEDULED'
        }
      };
      expect(isMatchupLocked(prop, now)).toBe(true);

      const prop2 = {
        status: 'STATUS_SCHEDULED',
        startTime: now + 50000,
        metadata: {
          isSinglePlayerProp: true,
          optionAStatus: 'STATUS_SCHEDULED',
          optionBStatus: 'STATUS_FINAL'
        }
      };
      expect(isMatchupLocked(prop2, now)).toBe(true);
    });

    it('locks player prop if parent game startTime has arrived', () => {
      const prop = {
        status: 'STATUS_SCHEDULED',
        startTime: now + 50000,
        metadata: {
          isPropMatchup: true,
          optionA: {
            gameId: 'game_123',
            startTime: now - 500
          }
        }
      };
      expect(isMatchupLocked(prop, now)).toBe(true);
    });
  });

  describe('extractOverUnderLine', () => {
    it('extracts from metadata overUnder or targetLine', () => {
      expect(extractOverUnderLine({ metadata: { overUnder: '44.5' } })).toBe(44.5);
      expect(extractOverUnderLine({ metadata: { targetLine: 25.5 } })).toBe(25.5);
    });

    it('extracts from title', () => {
      expect(extractOverUnderLine({ title: 'Colts @ Texans - O/U 44.5' })).toBe(44.5);
      expect(extractOverUnderLine({ title: 'Colts @ Texans - Over/Under 48' })).toBe(48);
    });
  });

  describe('getPropPlayerOrSubject and getPropTargetLine', () => {
    it('extracts player and target line from solo prop with metadata', () => {
      const matchup = {
        title: 'Dak Prescott - PASSING_YARDS (250.5)',
        type: 'OVER_UNDER',
        metadata: {
          isSoloProp: true,
          targetLine: 250.5,
          optionA: {
            playerName: 'Dak Prescott',
            statType: 'PASSING_YARDS',
            playerImage: 'https://espn.com/dak.png'
          }
        },
        awayTeam: { id: 'over', name: 'Over 250.5', image: '/images/over.png' },
        homeTeam: { id: 'under', name: 'Under 250.5', image: '/images/under.png' }
      };

      const playerInfo = getPropPlayerOrSubject(matchup);
      expect(playerInfo?.playerName).toBe('Dak Prescott');
      expect(playerInfo?.playerImage).toBe('https://espn.com/dak.png');

      const line = getPropTargetLine(matchup);
      expect(line).toBe(250.5);

      const category = getPropScoringCategory(matchup);
      expect(category).toBe('Passing Yards');
    });

    it('extracts player and target line from title when metadata optionA is missing', () => {
      const matchup = {
        title: 'Dak Prescott - PASSING_YARDS (250.5)',
        type: 'OVER_UNDER',
        awayTeam: { id: 'over', name: 'OVER', image: '/images/over.png' },
        homeTeam: { id: 'under', name: 'UNDER', image: '/images/under.png' }
      };

      const playerInfo = getPropPlayerOrSubject(matchup);
      expect(playerInfo?.playerName).toBe('Dak Prescott');

      const line = getPropTargetLine(matchup);
      expect(line).toBe(250.5);

      const category = getPropScoringCategory(matchup);
      expect(category).toBe('Passing Yards');
    });

    it('does not treat standard ATS / spread games as props or over-unders', () => {
      const atsGame = {
        title: 'Eagles @ Cowboys - ATS',
        type: 'SPREAD',
        league: 'NFL',
        metadata: {
          spread: -3.5,
          overUnder: 47.5
        },
        awayTeam: { id: 'eagles', name: 'Eagles', image: '/images/eagles.png' },
        homeTeam: { id: 'cowboys', name: 'Cowboys', image: '/images/cowboys.png' }
      };

      expect(getPropPlayerOrSubject(atsGame)).toBeNull();
      expect(getPropTargetLine(atsGame)).toBeNull();
      expect(getPropScoringCategory(atsGame)).toBeNull();
    });
  });

  describe('resolveOddsThresholds and evaluateOddsMatchupStatus', () => {
    it('uses universal default thresholds (-250 ATS start, -450 max ML, 9.5 spread cap)', () => {
      const thresholds = resolveOddsThresholds();
      expect(thresholds.atsMoneylineOdds).toBe(250);
      expect(thresholds.maxMoneylineOdds).toBe(450);
      expect(thresholds.maxPointSpread).toBe(9.5);
    });

    it('keeps games active as SCORE when moneyline is milder than atsMoneylineOdds', () => {
      const res = evaluateOddsMatchupStatus({
        league: 'NFL',
        mlHome: -175,
        mlAway: +150,
        spread: -3.5,
        config: { atsMoneylineOdds: -250, maxMoneylineOdds: -450, maxPointSpread: 9.5 }
      });
      expect(res.active).toBe(true);
      expect(res.matchupType).toBe('SCORE');
    });

    it('switches to SPREAD (ATS) when moneyline is in the window between atsMoneylineOdds and maxMoneylineOdds and spread <= cap', () => {
      const res = evaluateOddsMatchupStatus({
        league: 'NFL',
        mlHome: -320,
        mlAway: +260,
        spread: -7.5,
        config: { atsMoneylineOdds: -250, maxMoneylineOdds: -450, maxPointSpread: 9.5 }
      });
      expect(res.active).toBe(true);
      expect(res.matchupType).toBe('SPREAD');
    });

    it('deactivates game in ATS window if spread exceeds maxPointSpread', () => {
      const res = evaluateOddsMatchupStatus({
        league: 'CFB',
        mlHome: -380,
        mlAway: +300,
        spread: -14.5,
        config: { atsMoneylineOdds: -250, maxMoneylineOdds: -450, maxPointSpread: 9.5 }
      });
      expect(res.active).toBe(false);
      expect(res.matchupType).toBe('SCORE');
    });

    it('deactivates game if favorite odds are steeper than maxMoneylineOdds', () => {
      const res = evaluateOddsMatchupStatus({
        league: 'NBA',
        mlHome: -600,
        mlAway: +450,
        spread: -8.0,
        config: { atsMoneylineOdds: -250, maxMoneylineOdds: -450, maxPointSpread: 9.5 }
      });
      expect(res.active).toBe(false);
      expect(res.matchupType).toBe('SCORE');
    });

    it('respects sport-specific overrides from sportOddsRules', () => {
      const config = {
        atsMoneylineOdds: -250,
        maxMoneylineOdds: -450,
        maxPointSpread: 9.5,
        sportOddsRules: {
          CFB: {
            atsMoneylineOdds: -350,
            maxMoneylineOdds: -650,
            maxPointSpread: 17.5
          }
        }
      };

      const cfbThresholds = resolveOddsThresholds(config, 'CFB');
      expect(cfbThresholds.atsMoneylineOdds).toBe(350);
      expect(cfbThresholds.maxMoneylineOdds).toBe(650);
      expect(cfbThresholds.maxPointSpread).toBe(17.5);

      // CFB with -300 favorite stays SCORE because CFB ATS starts at -350
      const resScore = evaluateOddsMatchupStatus({
        league: 'CFB',
        mlHome: -300,
        mlAway: +240,
        spread: -6.5,
        config
      });
      expect(resScore.active).toBe(true);
      expect(resScore.matchupType).toBe('SCORE');

      // CFB with -500 and 14.5 spread converts to ATS because 14.5 <= 17.5
      const resAts = evaluateOddsMatchupStatus({
        league: 'CFB',
        mlHome: -500,
        mlAway: +380,
        spread: -14.5,
        config
      });
      expect(resAts.active).toBe(true);
      expect(resAts.matchupType).toBe('SPREAD');
    });
  });
});
