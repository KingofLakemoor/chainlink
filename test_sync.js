import { syncLeagueSchedules } from './dist/services/scheduleProcessor.js';
async function run() {
    try {
        console.log("Starting sync...");
        const res = await syncLeagueSchedules("LLWS", false);
        console.log("Sync response:", res);
    } catch(e) {
        console.error("Error", e);
    }
}
run();
