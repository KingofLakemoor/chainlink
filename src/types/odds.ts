export type OddsProvider = 'espn' | 'the-odds-api' | 'sharp-api' | 'none';

export interface NormalizedOdds {
  spread: number | null;          // Spread relative to home team (e.g. -3.5 or +7.0)
  favoriteTeamId?: string;       // ID of favored team
  overUnder: number | null;       // Total points line
  homeMoneyline: number | null;   // American format (e.g. -150, +130)
  awayMoneyline: number | null;
  provider: OddsProvider;        // Identifies source for auditing/debugging
  lineSummary?: string;          // Formatted line text (e.g. "KC -3.5")
  updatedAt?: string;
}

export interface StandardGame {
  id: string;
  sport: string;
  name: string;
  startTime: string;
  status: 'pre' | 'in' | 'post';
  homeTeam: {
    id: string;
    name: string;
    abbreviation: string;
    score?: number;
  };
  awayTeam: {
    id: string;
    name: string;
    abbreviation: string;
    score?: number;
  };
  odds: NormalizedOdds;
}

export interface SportOddsRule {
  maxMoneylineOdds?: number; // e.g. -450 (games with steeper odds are off the board)
  atsMoneylineOdds?: number; // e.g. -250 (games between atsMoneylineOdds and maxMoneylineOdds switch to ATS)
  maxPointSpread?: number;   // e.g. 9.5 (games in ATS window only switch if abs(spread) <= maxPointSpread)
}

export interface ScraperConfig {
  maxMoneylineOdds?: number; // Default e.g. -450 (or legacy -300)
  atsMoneylineOdds?: number; // Default e.g. -250
  maxPointSpread?: number;   // Default e.g. 9.5
  sportOverrides?: Record<string, number>; // Legacy per-sport maxMoneylineOdds map
  sportOddsRules?: Record<string, SportOddsRule>; // Full per-sport rules
}
