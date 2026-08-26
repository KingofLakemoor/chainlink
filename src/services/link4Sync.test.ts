import { describe, it, expect } from 'vitest';

function normalizeLink4Metadata(metadata?: any, mainMatchupMetadata?: any) {
  let metadataToSave = metadata ? JSON.parse(JSON.stringify(metadata)) : {};
  if (!metadataToSave) metadataToSave = {};

  if (metadataToSave.mlHome === undefined || metadataToSave.mlHome === null || metadataToSave.mlAway === undefined || metadataToSave.mlAway === null) {
    if (mainMatchupMetadata?.mlHome !== undefined && mainMatchupMetadata?.mlHome !== null) {
      metadataToSave.mlHome = mainMatchupMetadata.mlHome;
    }
    if (mainMatchupMetadata?.mlAway !== undefined && mainMatchupMetadata?.mlAway !== null) {
      metadataToSave.mlAway = mainMatchupMetadata.mlAway;
    }
  }

  if (metadataToSave.mlHome === undefined || metadataToSave.mlHome === null) {
    metadataToSave.mlHome = -110;
  }
  if (metadataToSave.mlAway === undefined || metadataToSave.mlAway === null) {
    metadataToSave.mlAway = -110;
  }

  return metadataToSave;
}

describe('Link4 Matchup Metadata Normalization', () => {
  it('preserves existing scraped moneyline odds if present', () => {
    const scraped = { mlHome: -150, mlAway: 130 };
    const result = normalizeLink4Metadata(scraped);
    expect(result).toEqual({ mlHome: -150, mlAway: 130 });
  });

  it('merges moneyline odds from main matchups collection if scraped metadata is null/missing', () => {
    const scraped = { mlHome: null, mlAway: null };
    const mainOdds = { mlHome: -200, mlAway: 170 };
    const result = normalizeLink4Metadata(scraped, mainOdds);
    expect(result).toEqual({ mlHome: -200, mlAway: 170 });
  });

  it('falls back to default moneyline (-110) when no odds are available in scraped or main matchup', () => {
    const scraped = null;
    const result = normalizeLink4Metadata(scraped);
    expect(result).toEqual({ mlHome: -110, mlAway: -110 });
  });
});
