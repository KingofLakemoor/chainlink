async function run() {
    const res = await fetch('https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard');
    const data = await res.json();
    console.log("Season:", JSON.stringify(data.season, null, 2));
    console.log("Week:", JSON.stringify(data.week, null, 2));
    if (data.events && data.events.length > 0) {
        console.log("First event week:", JSON.stringify(data.events[0].week, null, 2));
        console.log("First event season:", JSON.stringify(data.events[0].season, null, 2));
    }
}
run();
