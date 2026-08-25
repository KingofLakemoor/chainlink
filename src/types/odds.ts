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
