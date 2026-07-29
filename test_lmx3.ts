import { getScheduleEndpoints, fetchScheduleData } from './src/services/espnScraper.ts';
async function run() {
  const eps = getScheduleEndpoints('LMX', false, ['20260726']);
  console.log(eps);
  for (const ep of eps) {
     const data = await fetchScheduleData(ep, 'LMX', false);
     console.log(JSON.stringify(data, null, 2).substring(0, 500));
  }
}
run();
