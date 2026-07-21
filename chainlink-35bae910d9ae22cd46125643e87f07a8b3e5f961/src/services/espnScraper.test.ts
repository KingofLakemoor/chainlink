import { test, expect } from 'vitest';
import {
  MATCHUP_FINAL_STATUSES,
  MATCHUP_IN_PROGRESS_STATUSES,
  MATCHUP_DELAYED_STATUSES,
  MATCHUP_POSTPONED_STATUSES,
  MATCHUP_SCHEDULED_STATUSES,
  MATCHUP_UNKNOWN_STATUSES,
  getScheduleEndpoints,
} from './espnScraper.ts';

test('MATCHUP_FINAL_STATUSES contains expected values', () => {
  const expected = [
    "STATUS_FINAL",
    "STATUS_FULL_TIME",
    "STATUS_FULL_PEN",
    "STATUS_FINAL_AET",
    "STATUS_FINAL_ET",
    "STATUS_FINAL_OT",
    "STATUS_FORFEIT",
    "STATUS_FINAL_OVERTIME",
    "STATUS_FINAL_SHOOTOUT",
    "STATUS_FINAL_PENALTIES",
    "STATUS_RETIRED",
    "STATUS_WALKOVER",
  ];
  expect(MATCHUP_FINAL_STATUSES).toEqual(expected);
});

test('MATCHUP_IN_PROGRESS_STATUSES contains expected values', () => {
  const expected = [
    "STATUS_IN_PROGRESS",
    "STATUS_FIRST_HALF",
    "STATUS_SECOND_HALF",
    "STATUS_HALFTIME",
    "STATUS_END_PERIOD",
    "STATUS_END_QUARTER",
    "STATUS_END_REGULATION",
    "STATUS_END_GAME",
    "STATUS_SHOOTOUT",
    "STATUS_END_OF_EXTRATIME",
    "STATUS_IN_PROGRESS_PEN",
    "STATUS_IN_PROGRESS_ET",
    "STATUS_OVERTIME",
    "STATUS_IN_PROGRESS_PEN_ET",
  ];
  expect(MATCHUP_IN_PROGRESS_STATUSES).toEqual(expected);
});

test('MATCHUP_DELAYED_STATUSES contains expected values', () => {
  const expected = [
    "STATUS_DELAYED",
    "STATUS_RAIN_DELAY",
    "STATUS_DELAY",
    "STATUS_SUSPENDED",
  ];
  expect(MATCHUP_DELAYED_STATUSES).toEqual(expected);
});

test('MATCHUP_POSTPONED_STATUSES contains expected values', () => {
  const expected = [
    "STATUS_POSTPONED",
    "STATUS_CANCELED",
    "STATUS_ABANDONDED",
  ];
  expect(MATCHUP_POSTPONED_STATUSES).toEqual(expected);
});

test('MATCHUP_SCHEDULED_STATUSES contains expected values', () => {
  const expected = ["STATUS_SCHEDULED"];
  expect(MATCHUP_SCHEDULED_STATUSES).toEqual(expected);
});

test('MATCHUP_UNKNOWN_STATUSES contains expected values', () => {
  const expected = ["STATUS_UNKNOWN"];
  expect(MATCHUP_UNKNOWN_STATUSES).toEqual(expected);
});

test('getScheduleEndpoints throws error for unsupported league', () => {
  expect(() => {
    getScheduleEndpoints('INVALID-LEAGUE' as any);
  }).toThrow(/Unsupported league: INVALID-LEAGUE/);
});

test('getScheduleEndpoints returns correct endpoints for NFL', () => {
  const endpoints = getScheduleEndpoints('NFL');
  expect(endpoints.length).toBe(1);
  expect(endpoints[0]).toContain('cdn.espn.com/core/nfl/schedule');
});

test('getScheduleEndpoints returns correct endpoints for NFL scoreboardOnly', () => {
  const endpoints = getScheduleEndpoints('NFL', true);
  expect(endpoints.length).toBe(4);
  expect(endpoints[0]).toContain('site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard');
});

test('getScheduleEndpoints returns correct endpoints for MBB (always scoreboard)', () => {
  const endpoints = getScheduleEndpoints('MBB');
  expect(endpoints.length).toBe(4);
  expect(endpoints[0]).toContain('mens-college-basketball/scoreboard');
});

test('getScheduleEndpoints returns correct endpoints for PGA', () => {
  const endpoints = getScheduleEndpoints('PGA');
  expect(endpoints.length).toBe(1);
  expect(endpoints[0]).toContain('golf/leaderboard?league=pga');
});
