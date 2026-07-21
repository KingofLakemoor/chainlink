export interface ScriptLessCompetitor {
  name: string;
  logo: string;
  score: number;
}

export interface ScriptLessPayload {
  eventId: string;
  league: string;
  name: string;
  startTime: string;
  status: string;
  homeTeam: ScriptLessCompetitor;
  awayTeam: ScriptLessCompetitor;
  metadata?: any;
}
