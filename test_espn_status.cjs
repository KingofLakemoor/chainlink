async function run() {
    const res = await fetch('https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/summary?event=401816234');
    const data = await res.json();
    console.log(data.header.competitions[0].status);
}
run();
