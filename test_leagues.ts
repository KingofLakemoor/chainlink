import { SUPPORTED_LEAGUES, getScheduleEndpoints } from './src/services/espnScraper.js';

let missing = [];

SUPPORTED_LEAGUES.forEach(league => {
    try {
        const endpoints = getScheduleEndpoints(league, [], false);
        if (!endpoints || endpoints.length === 0) {
             missing.push(league);
        }
    } catch (e) {
        missing.push(league);
        console.error(`League ${league} failed: ${e.message}`);
    }
});

console.log("Missing leagues:", missing);
