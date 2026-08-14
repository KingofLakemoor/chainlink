async function test() {
    const url = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=401671911';
    const res = await fetch(url);
    const data = await res.json();
    
    if (data.boxscore && data.boxscore.players) {
        console.log("Team 1:", data.boxscore.players[0].team.displayName);
        const stats = data.boxscore.players[0].statistics;
        console.log("Categories:", stats.map(s => s.name));
        const firstAthlete = stats[0].athletes[0];
        console.log("Athlete 1:", JSON.stringify(firstAthlete, null, 2));
    }
}
test().catch(console.error);
