import { SUPPORTED_LEAGUES, getScheduleEndpoints } from './src/services/espnScraper.js';

async function run() {
    const results = [];
    const todayStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    
    for (const league of SUPPORTED_LEAGUES) {
        if (league === 'SCRIPTLESS') continue;
        
        let endpoints;
        try {
            endpoints = getScheduleEndpoints(league, [todayStr], true);
        } catch (e) {
            results.push({ league, status: 'ERROR', error: e.message });
            continue;
        }

        const url = endpoints[0];
        try {
            // using native fetch
            const res = await globalThis.fetch(url);
            if (!res.ok) {
                results.push({ league, status: 'HTTP_ERROR', code: res.status, url });
            } else {
                const data = await res.json();
                const events = data.events || data.content?.sbData?.events || [];
                if (data.events !== undefined || data.content !== undefined || data.sports !== undefined || data.seasons !== undefined || data.header !== undefined) {
                     results.push({ league, status: 'OK', events: events.length });
                } else {
                     results.push({ league, status: 'INVALID_FORMAT' });
                }
            }
        } catch (e) {
            results.push({ league, status: 'FETCH_ERROR', url, error: e.message });
        }
    }
    
    console.table(results);
}
run();
