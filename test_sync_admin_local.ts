import { adminDb } from './src/lib/firebase-admin.js';
import { scrapeLeagueSchedules } from './src/services/scheduleProcessor.js';

async function run() {
  const segmentId = "segment_1787759902919"; 
  const segmentDoc = await adminDb!.collection('link4Segments').doc(segmentId).get();
  if (!segmentDoc.exists) { console.log("No segment found"); return; }
  
  const segment = segmentDoc.data()!;
  console.log("Segment bounds:", new Date(segment.startTime).toLocaleString(), "to", new Date(segment.endTime).toLocaleString());

  let leaguesToSync = ['CFB'];
  let count = 0;

  for (const lg of leaguesToSync) {
    let effectiveBeginDate = segment.startTime ? new Date(segment.startTime).getTime() : undefined;
    let effectiveEndDate = segment.endTime ? new Date(segment.endTime).getTime() : undefined;

    const filterBegin = effectiveBeginDate ? effectiveBeginDate : undefined;
    const filterEnd = effectiveEndDate ? effectiveEndDate : undefined;

    console.log("Filter Bounds:", filterBegin ? new Date(filterBegin).toLocaleString() : "none", filterEnd ? new Date(filterEnd).toLocaleString() : "none");

    const startDay = new Date(effectiveBeginDate! - 1 * 86400000);
    const endDay = new Date(effectiveEndDate! + 1 * 86400000);
    let curr = new Date(startDay);
    let days = 0;
    const dateSet = new Set<string>();
    while (curr <= endDay && days <= 60) {
      const str = curr.toLocaleString("en-US", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" });
      const [month, day, year] = str.split("/");
      dateSet.add(`${year}${month}${day}`);
      curr = new Date(curr.getTime() + 86400000);
      days++;
    }
    const specificDates = Array.from(dateSet);
    console.log("Specific Dates for Scrape:", specificDates);

    const matchupsToProcess: any[] = [];
    const resScrape = await scrapeLeagueSchedules(lg, false, undefined, specificDates);
    if (resScrape.data) {
      matchupsToProcess.push(...resScrape.data);
    }
    
    // Simulating the existing matchups part
    // ... skipping for test ...

    let found = 0;
    for (const m of matchupsToProcess) {
      const validStartTime = typeof m.startTime === 'number' ? m.startTime : (m.startTime ? new Date(m.startTime).getTime() : Date.now());
      if (filterBegin && validStartTime < filterBegin) continue;
      if (filterEnd && validStartTime > filterEnd) continue;
      found++;
      console.log("Matched:", m.title, new Date(validStartTime).toLocaleString());
    }
    console.log(`Total matched for ${lg}:`, found);
  }
}
run().catch(console.error);
