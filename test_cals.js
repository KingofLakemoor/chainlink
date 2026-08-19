async function run() {
    const sports = [
        'football/nfl',
        'basketball/nba',
        'baseball/mlb',
        'football/college-football',
        'soccer/eng.1'
    ];
    for (const s of sports) {
        const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${s}/scoreboard`);
        const data = await res.json();
        console.log(`\n--- ${s} ---`);
        if (data.leagues && data.leagues[0].calendar) {
             const cal = data.leagues[0].calendar;
             if (Array.isArray(cal)) {
                 if (cal.length > 0 && cal[0].entries) {
                     console.log("Has entries:", cal[0].entries[0].label);
                 } else {
                     console.log("Array of dates?", cal.slice(0,2));
                 }
             } else {
                 console.log("Not array?");
             }
        }
    }
}
run();
