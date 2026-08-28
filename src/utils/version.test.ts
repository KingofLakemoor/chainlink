import { describe, it, expect } from 'vitest';
import { parseVersionTime, isServerVersionNewer } from './version';

describe('Version Utils', () => {
  describe('parseVersionTime', () => {
    it('parses numeric millisecond string', () => {
      const timestamp = 1747674000000;
      expect(parseVersionTime(String(timestamp))).toBe(timestamp);
    });

    it('parses ISO date string', () => {
      const iso = '2025-05-19T17:00:00.000Z';
      const expected = new Date(iso).getTime();
      expect(parseVersionTime(iso)).toBe(expected);
    });

    it('returns NaN for empty or invalid inputs', () => {
      expect(parseVersionTime('')).toBeNaN();
      expect(parseVersionTime(null as any)).toBeNaN();
    });
  });

  describe('isServerVersionNewer', () => {
    const baseTime = 1700000000000;
    const baseIso = new Date(baseTime).toISOString();

    it('returns false when server and local versions are identical strings', () => {
      expect(isServerVersionNewer(baseIso, baseIso)).toBe(false);
      expect(isServerVersionNewer('1700000000000', '1700000000000')).toBe(false);
    });

    it('returns false when server time is equal or less than local time', () => {
      const serverIso = new Date(baseTime).toISOString();
      const localIso = new Date(baseTime + 10000).toISOString();
      expect(isServerVersionNewer(serverIso, localIso)).toBe(false);
    });

    it('returns false when server time is within the 5-second buffer of local time', () => {
      const serverIso = new Date(baseTime + 3000).toISOString();
      const localIso = baseIso;
      expect(isServerVersionNewer(serverIso, localIso)).toBe(false);
    });

    it('returns true when server time is more than 5 seconds newer than local time', () => {
      const serverIso = new Date(baseTime + 10000).toISOString();
      const localIso = baseIso;
      expect(isServerVersionNewer(serverIso, localIso)).toBe(true);
    });

    it('correctly compares numeric string (server) and ISO string (local)', () => {
      const serverNumeric = String(baseTime + 10000);
      const localIso = baseIso;
      expect(isServerVersionNewer(serverNumeric, localIso)).toBe(true);
    });

    it('correctly compares ISO string (server) and numeric string (local)', () => {
      const serverIso = new Date(baseTime + 10000).toISOString();
      const localNumeric = String(baseTime);
      expect(isServerVersionNewer(serverIso, localNumeric)).toBe(true);
    });

    it('returns false when missing server or local version', () => {
      expect(isServerVersionNewer(null, baseIso)).toBe(false);
      expect(isServerVersionNewer(baseIso, null)).toBe(false);
      expect(isServerVersionNewer(undefined, undefined)).toBe(false);
    });
  });
});
