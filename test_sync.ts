import { adminDb } from './src/lib/firebase-admin.js';
import { scrapeLeagueSchedules } from './src/services/scheduleProcessor.js';

async function run() {
  const lg = 'CFB';
  const effectiveBeginDate = 1787759902919; // Just an example, let's use the segment's actual startTime
  const segmentDoc = await adminDb!.collection('link4Segments').doc('segment_1787759902919').get();
  const segment = segmentDoc.data()!;
  
  let effBegin = segment.startTime ? new Date(segment.startTime).getTime() : Date.now();
  let effEnd = segment.endTime ? new Date(segment.endTime).getTime() : effBegin + (14 * 86400000);
  
  const filterBegin = effBegin - (7 * 24 * 3600 * 1000);
  const filterEnd = effEnd + (7 * 24 * 3600 * 1000);
  
  console.log("Filtering between:", new Date(filterBegin).toLocaleString(), "and", new Date(filterEnd).toLocaleString());
  
  const startDay = new Date(effBegin - 7 * 86400000);
  const endDay = new Date(effEnd + 7 * 86400000);
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
  console.log("Specific Dates:", specificDates);
  
  try {
    const resScrape = await scrapeLeagueSchedules(lg, false, undefined, specificDates);
    console.log("Scraped", resScrape.data?.length, "matchups");
    if (resScrape.data) {
      let filtered = 0;
      resScrape.data.forEach((m: any) => {
        const mTime = typeof m.startTime === 'number' ? m.startTime : new Date(m.startTime).getTime();
        if (mTime < filterBegin || mTime > filterEnd) return;
        filtered++;
        console.log("Found:", m.title || `${m.awayTeam?.name} @ ${m.homeTeam?.name}`, new Date(mTime).toLocaleString());
      });
      console.log("Total matching filter:", filtered);
    }
  } catch(e) {
    console.error(e);
  }
}
run();
