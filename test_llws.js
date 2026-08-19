async function run() {
    const dates = ["20260819", "20260818", "20260817", "20260820"];
    for (const d of dates) {
        const url = `https://site.api.espn.com/apis/site/v2/sports/baseball/llb/scoreboard?dates=${d}`;
        const res = await fetch(url);
        const data = await res.json();
        const events = data.events || [];
        console.log(`Date: ${d} - Found ${events.length} LLWS games`);
        events.forEach(e => {
            const name = e.name || '';
            if (name.includes("Santiago") || name.includes("Leon")) {
                console.log(e.id, name, e.status.type.name, e.status.type.shortDetail);
            }
        });
    }
}
run();
