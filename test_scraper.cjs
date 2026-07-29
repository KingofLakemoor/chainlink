async function fetchScheduleData(endpoint) {
  const response = await fetch(endpoint);
  const data = await response.json();
  const scheduleData = {};
  const uniqueEvents = [];
  const seenGameIds = new Set();
  for (const event of (data.events || [])) {
    if (!seenGameIds.has(event.id)) {
      seenGameIds.add(event.id);
      uniqueEvents.push(event);
    }
  }
  for (const event of uniqueEvents) {
    const date = event.date?.split("T")[0].replace(/-/g, "");
    if (!date) continue;
    if (!scheduleData[date]) scheduleData[date] = { games: [] };
    scheduleData[date].games.push(event);
  }
  return scheduleData;
}
async function run() {
  const data = await fetchScheduleData('https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard?dates=20260730');
  let parsed = 0;
  for (const day in data) {
    for (const game of data[day].games) {
      const competition = game.competitions?.[0];
      if (!competition) continue;
      const home = competition.competitors.find(c => c.homeAway === "home");
      const away = competition.competitors.find(c => c.homeAway === "away");
      if (!home || !away) continue;
      parsed++;
    }
  }
  console.log("Parsed:", parsed);
}
run();
