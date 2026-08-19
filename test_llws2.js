async function run() {
    const url = `https://site.api.espn.com/apis/site/v2/sports/baseball/llb/scoreboard?dates=20260819`;
    const res = await fetch(url);
    const data = await res.json();
    const events = data.events || [];
    events.forEach(e => {
        const name = e.name || '';
        if (name.includes("Santiago") || name.includes("Leon")) {
            console.log(JSON.stringify(e, null, 2));
        }
    });
}
run();
