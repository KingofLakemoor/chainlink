import { syncLeagueSchedules } from './src/services/scheduleProcessor.js';
async function test() {
    await syncLeagueSchedules('ATP');
}
test();
