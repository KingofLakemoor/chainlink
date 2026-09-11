import { describe, it, expect } from 'vitest';

export function getMatchupDisplayTitle(m: {
  league?: string;
  type?: string;
  title: string;
  awayTeam?: { name: string };
  homeTeam?: { name: string };
  metadata?: { spread?: number; overUnder?: number };
}): string {
  if (m.type === 'SPREAD' && m.metadata?.spread !== undefined && !m.title.includes('ATS')) {
    return `${m.title} - ATS`;
  }
  if (m.type === 'SOCCER_SCORE' && m.awayTeam?.name && m.homeTeam?.name) {
    return `${m.awayTeam.name} @ ${m.homeTeam.name}`;
  }
  return m.title;
}

export function handleTypeChangeHelper(prevData: any, newType: string): any {
  const newData = { ...prevData, type: newType };
  const awayName = newData.awayTeam?.name || 'Away';
  const homeName = newData.homeTeam?.name || 'Home';

  if (newType === 'SPREAD') {
    newData.title = `${awayName} @ ${homeName} - ATS`;
    newData.hasCustomTitle = true;
  } else if (newType === 'OVER_UNDER') {
    newData.title = `${awayName} @ ${homeName} - O/U ${newData.metadata?.overUnder ?? ''}`.trim();
    newData.hasCustomTitle = true;
  } else if (newType === 'SOCCER_SCORE') {
    newData.title = `${awayName} @ ${homeName}`.trim();
    newData.hasCustomTitle = true;
  }

  return newData;
}

describe('Matchups Admin Hub & Matchup Title Logic', () => {
  it('appends - ATS to College Football (CFB) spread matchups on the gameboard when missing from title', () => {
    const cfbMatchup = {
      league: 'CFB',
      type: 'SPREAD',
      title: 'Scarlet Knights @ Eagles',
      awayTeam: { name: 'Rutgers Scarlet Knights' },
      homeTeam: { name: 'Boston College Eagles' },
      metadata: { spread: -3 }
    };

    expect(getMatchupDisplayTitle(cfbMatchup)).toBe('Scarlet Knights @ Eagles - ATS');
  });

  it('does not double-append - ATS if the title already contains ATS', () => {
    const cfbMatchup = {
      league: 'CFB',
      type: 'SPREAD',
      title: 'Scarlet Knights @ Eagles - ATS',
      metadata: { spread: -3 }
    };

    expect(getMatchupDisplayTitle(cfbMatchup)).toBe('Scarlet Knights @ Eagles - ATS');
  });

  it('appends - ATS to NFL spread matchups when missing from title', () => {
    const nflMatchup = {
      league: 'NFL',
      type: 'SPREAD',
      title: 'Chiefs @ Raiders',
      metadata: { spread: -7 }
    };

    expect(getMatchupDisplayTitle(nflMatchup)).toBe('Chiefs @ Raiders - ATS');
  });

  it('returns standard title for non-spread matchups', () => {
    const moneylineMatchup = {
      league: 'CFB',
      type: 'MONEYLINE',
      title: 'Tigers @ Jayhawks',
      metadata: {}
    };

    expect(getMatchupDisplayTitle(moneylineMatchup)).toBe('Tigers @ Jayhawks');
  });

  it('automatically formats title when switching matchup type to SPREAD in admin editor', () => {
    const initialData = {
      league: 'CFB',
      type: 'SCORE',
      title: 'Rutgers @ Boston College',
      awayTeam: { name: 'Rutgers' },
      homeTeam: { name: 'Boston College' },
      metadata: { spread: -3.5 }
    };

    const updated = handleTypeChangeHelper(initialData, 'SPREAD');
    expect(updated.type).toBe('SPREAD');
    expect(updated.title).toBe('Rutgers @ Boston College - ATS');
    expect(updated.hasCustomTitle).toBe(true);
  });

  it('automatically formats title when switching matchup type to OVER_UNDER in admin editor', () => {
    const initialData = {
      league: 'CFB',
      type: 'SCORE',
      title: 'Rutgers @ Boston College',
      awayTeam: { name: 'Rutgers' },
      homeTeam: { name: 'Boston College' },
      metadata: { overUnder: 52.5 }
    };

    const updated = handleTypeChangeHelper(initialData, 'OVER_UNDER');
    expect(updated.type).toBe('OVER_UNDER');
    expect(updated.title).toBe('Rutgers @ Boston College - O/U 52.5');
    expect(updated.hasCustomTitle).toBe(true);
  });

  it('automatically formats title when switching matchup type to SOCCER_SCORE in admin editor', () => {
    const initialData = {
      league: 'EPL',
      type: 'SCORE',
      title: 'Arsenal vs Chelsea - Custom',
      awayTeam: { name: 'Arsenal' },
      homeTeam: { name: 'Chelsea' },
      metadata: {}
    };

    const updated = handleTypeChangeHelper(initialData, 'SOCCER_SCORE');
    expect(updated.type).toBe('SOCCER_SCORE');
    expect(updated.title).toBe('Arsenal @ Chelsea');
    expect(updated.hasCustomTitle).toBe(true);
  });
});
