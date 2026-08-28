/**
 * Utility functions for parsing and comparing application version strings / build timestamps.
 */

export function parseVersionTime(versionStr: string): number {
  if (!versionStr || typeof versionStr !== 'string') {
    return NaN;
  }
  const trimmed = versionStr.trim();
  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed);
  }
  const parsed = new Date(trimmed).getTime();
  return parsed;
}

export function isServerVersionNewer(
  serverVersion: string | null | undefined,
  localVersion: string | null | undefined,
  bufferMs = 5000
): boolean {
  if (!serverVersion || !localVersion) {
    return false;
  }

  if (serverVersion === localVersion) {
    return false;
  }

  const serverTime = parseVersionTime(serverVersion);
  const localTime = parseVersionTime(localVersion);

  if (!isNaN(serverTime) && !isNaN(localTime)) {
    return serverTime > localTime + bufferMs;
  }

  // Fallback for non-numeric/non-date version strings (e.g., semver strings)
  return serverVersion !== localVersion;
}
