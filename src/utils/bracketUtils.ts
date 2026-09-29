export interface BracketHelperInput {
  sport?: string;
  id?: string;
  teams?: string[];
  pointValues?: Record<string, number>;
}

export function getRoundNamesForBracket(bracket: BracketHelperInput): string[] {
  if (!bracket) return [];
  const teams = bracket.teams || [];
  const baseTeams = teams.length;
  const isMlb = bracket.sport === 'MLB' || bracket.id?.includes('mlb');

  if (isMlb) {
    return ["Wild Card Series", "Division Series", "League Championship Series", "World Series"];
  }
  if (baseTeams === 8) return ["Quarter Finals", "Semi Finals", "Finals"];
  if (baseTeams === 16) return ["Round of 16", "Quarter Finals", "Semi Finals", "Finals"];
  if (baseTeams === 32) return ["Round of 32", "Round of 16", "Quarter Finals", "Semi Finals", "Finals"];
  if (baseTeams === 64) return ["Round of 64", "Round of 32", "Round of 16", "Quarter Finals", "Semi Finals", "Finals"];

  const numRounds = Math.max(1, Math.ceil(Math.log2(baseTeams || 2)));
  return Array.from({ length: numRounds }, (_, i) => `Round ${i + 1}`);
}

export function getOrderedPointValues(bracket: BracketHelperInput): Array<{ roundName: string; points: number }> {
  if (!bracket || !bracket.pointValues) return [];
  const roundNames = getRoundNamesForBracket(bracket);
  const pointValues = bracket.pointValues;

  // First try to match roundNames in chronological order
  const ordered: Array<{ roundName: string; points: number }> = [];
  const matchedKeys = new Set<string>();

  roundNames.forEach(rName => {
    if (pointValues[rName] !== undefined) {
      ordered.push({ roundName: rName, points: pointValues[rName] });
      matchedKeys.add(rName);
    }
  });

  // Then add any remaining keys from pointValues sorted if needed
  Object.keys(pointValues).forEach(key => {
    if (!matchedKeys.has(key)) {
      ordered.push({ roundName: key, points: pointValues[key] });
    }
  });

  return ordered;
}

export function formatPointValuesInOrder(bracket: BracketHelperInput): string {
  const ordered = getOrderedPointValues(bracket);
  if (ordered.length === 0) return '';
  return ordered.map(item => item.points).join(' / ');
}

export function isBracketLocked(bracket: any, now = Date.now()): boolean {
  if (!bracket) return false;

  if (
    bracket.status === 'LOCKED' ||
    bracket.status === 'COMPLETED' ||
    bracket.payoutComplete === true ||
    bracket.locked === true ||
    bracket.isLocked === true
  ) {
    return true;
  }

  if (bracket.lockDate) {
    const lockTs = typeof bracket.lockDate === 'number'
      ? bracket.lockDate
      : new Date(bracket.lockDate).getTime();
    if (!isNaN(lockTs) && lockTs > 0 && now >= lockTs) {
      return true;
    }
  }

  if (bracket.matchTimes && typeof bracket.matchTimes === 'object') {
    const validTimes: number[] = [];
    for (const val of Object.values(bracket.matchTimes)) {
      if (!val) continue;
      const t = typeof val === 'number' ? val : new Date(val as string | number).getTime();
      if (!isNaN(t) && t > 0) {
        validTimes.push(t);
      }
    }
    if (validTimes.length > 0) {
      const firstGameTime = Math.min(...validTimes);
      if (now >= firstGameTime) {
        return true;
      }
    }
  }

  return false;
}
