import 'dotenv/config';
import { syncLeagueSchedules } from './src/services/scheduleProcessor.js';
import { initializeApp, cert } from 'firebase-admin/app';
async function run() {
    try {
        console.log("Starting sync LLWS...");
        const res = await syncLeagueSchedules("LLWS", false);
        console.log("Sync response:", res);
    } catch(e) {
        console.error("Error", e);
    }
}
run();
