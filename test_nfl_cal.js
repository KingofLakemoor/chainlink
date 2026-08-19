async function run() {
    const res = await fetch('https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard');
    const data = await res.json();
    console.log("Calendar:", JSON.stringify(data.leagues[0].calendar, null, 2));
}
run();
