export interface Gridiron3x3Game {
  gameId: string;
  league: "NFL" | "CFB";
  awayTeam: { name: string; abbreviation: string; logoUrl?: string };
  homeTeam: { name: string; abbreviation: string; logoUrl?: string };
  kickoffTime: number | any;
  status: "scheduled" | "in_progress" | "final";
  spread: {
    awaySpread: number;      // e.g., +3.5
    homeSpread: number;      // e.g., -3.5
  };
  total: {
    line: number;            // e.g., 47.5
    over: number;
    under: number;
  };
}

export interface Gridiron3x3LinesDocument {
  season: number;
  weekNumber: number;
  snapshotTimestamp: number | any;
  games: Gridiron3x3Game[];
}

export interface GridironPick {
  gameId: string;
  league: "NFL" | "CFB";
  pickType: "spread" | "total";
  selection: "away_spread" | "home_spread" | "over" | "under" | "HIDDEN";
  value: number;
  kickoffTime: number | any;
  status: "pending" | "won" | "lost" | "push";
}

export interface GridironContest {
  contestId: string;
  name: string;
  createdBy: string; // userId
  inviteCode: string;
  season: number;
  weekNumber: number;
  participants: string[]; // userIds
  createdAt?: number;
}

export interface GridironEntry {
  entryId: string;
  contestId: string;
  userId: string;
  displayName: string;
  season: number;
  weekNumber: number;
  createdAt: number | any;
  updatedAt: number | any;
  picks: GridironPick[];
}

export interface GridironLeaderboardRecord {
  userId: string;
  displayName: string;
  // Total Record
  totalWins: number;
  totalLosses: number;
  totalPushes: number;
  // NFL Record
  nflWins: number;
  nflLosses: number;
  nflPushes: number;
  // CFB Record
  cfbWins: number;
  cfbLosses: number;
  cfbPushes: number;
  // Calculated Win Percentage
  winPercentage: number;
}

export interface GridironWeeklySnapshot {
  season: number;
  weekNumber: number;
  snapshotTimestamp: number;
  isFinalized: boolean;
  entries: GridironEntry[];
}
