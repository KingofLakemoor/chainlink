import assert from 'node:assert';

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

function generateSyncDates(effectiveBeginDate: number, effectiveEndDate: number): string[] {
  const startDay = new Date(effectiveBeginDate - 86400000);
  const endDay = new Date(effectiveEndDate + 86400000);
  let curr = new Date(startDay);
  let days = 0;
  const dateSet = new Set<string>();
  while (curr <= endDay && days <= 40) {
    const str = curr.toLocaleString("en-US", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" });
    const [month, day, year] = str.split("/");
    dateSet.add(`${year}${month}${day}`);
    curr = new Date(curr.getTime() + 86400000);
    days++;
  }
  return Array.from(dateSet);
}

function filterSyncedMatchups(matchups: any[], effectiveBeginDate?: number, effectiveEndDate?: number): any[] {
  const filterBegin = effectiveBeginDate ? effectiveBeginDate - (12 * 3600 * 1000) : undefined;
  const filterEnd = effectiveEndDate ? effectiveEndDate + (12 * 3600 * 1000) : undefined;

  return matchups.filter(m => {
    if (filterBegin && m.startTime < filterBegin) return false;
    if (filterEnd && m.startTime > filterEnd) return false;
    return true;
  });
}

function runTests() {
  console.log('Running Link4 sync unit tests...');

  // 1. Metadata Normalization Tests
  const res1 = normalizeLink4Metadata({ mlHome: -150, mlAway: 130 });
  assert.deepStrictEqual(res1, { mlHome: -150, mlAway: 130 });

  const res2 = normalizeLink4Metadata({ mlHome: null, mlAway: null }, { mlHome: -200, mlAway: 170 });
  assert.deepStrictEqual(res2, { mlHome: -200, mlAway: 170 });

  const res3 = normalizeLink4Metadata(null);
  assert.deepStrictEqual(res3, { mlHome: -110, mlAway: -110 });

  // 2. Date Range Generation Tests
  const start = new Date('2026-03-01T00:00:00.000Z').getTime();
  const end = new Date('2026-03-03T23:59:59.000Z').getTime();
  const dates = generateSyncDates(start, end);

  assert.ok(dates.includes('20260301'), 'Should include 20260301');
  assert.ok(dates.includes('20260302'), 'Should include 20260302');
  assert.ok(dates.includes('20260303'), 'Should include 20260303');

  // 3. Matchup Filtering Tests
  const startSegment = new Date('2026-03-01T18:00:00.000Z').getTime();
  const endSegment = new Date('2026-03-02T23:59:59.000Z').getTime();

  const testMatchups = [
    { id: 1, startTime: startSegment - (2 * 3600 * 1000) }, // 2h before start -> kept
    { id: 2, startTime: startSegment + (2 * 3600 * 1000) }, // inside segment -> kept
    { id: 3, startTime: endSegment + (2 * 3600 * 1000) },   // 2h after end -> kept
    { id: 4, startTime: startSegment - (15 * 3600 * 1000) } // 15h before start -> filtered
  ];

  const filtered = filterSyncedMatchups(testMatchups, startSegment, endSegment);
  assert.deepStrictEqual(filtered.map(m => m.id), [1, 2, 3]);

  console.log('All Link4 sync unit tests passed successfully!');
}

runTests();
