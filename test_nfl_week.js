async function run() {
    const res = await fetch('https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?seasontype=1&week=2');
    const data = await res.json();
    console.log("Week 2 Preseason events:", data.events?.length);
    if(data.events && data.events.length > 0) {
        console.log("First event:", data.events[0].name, data.events[0].date);
    }
}
run();
