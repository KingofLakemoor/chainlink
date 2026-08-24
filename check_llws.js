import fetch from 'node-fetch';
async function run() {
    const res = await fetch('https://site.api.espn.com/apis/site/v2/sports/baseball/llb/scoreboard', {
        headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const parsed = await res.json();
    if (parsed.events && parsed.events.length > 0) {
        const comps = parsed.events[0].competitions[0].competitors;
        console.log(JSON.stringify(comps.map(c => ({ id: c.id, homeAway: c.homeAway, name: c.team?.displayName, logo: c.team?.logo })), null, 2));
    } else {
        console.log("No events found");
    }
}
run();
