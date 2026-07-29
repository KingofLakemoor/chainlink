// test_filter.ts
var m_startTime = (/* @__PURE__ */ new Date("2026-07-28T17:40:00.000Z")).getTime();
var campaign = {
  gamesBeginDate: (/* @__PURE__ */ new Date("2026-07-30T15:15:00.000Z")).getTime(),
  // e.g. July 30, 8:15 AM PDT
  endDate: (/* @__PURE__ */ new Date("2027-01-29T00:00:00.000Z")).getTime()
};
console.log("m_startTime", new Date(m_startTime).toLocaleString());
console.log("campaign.gamesBeginDate", new Date(campaign.gamesBeginDate).toLocaleString());
console.log("m.startTime < campaign.gamesBeginDate:", m_startTime < campaign.gamesBeginDate);
