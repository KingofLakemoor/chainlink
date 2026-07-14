import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatUpcomingTime = (timestamp: number) => {
  const date = new Date(timestamp);
  const now = new Date();

  const diffMs = date.getTime() - now.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins >= 0 && diffMins <= 60) {
    if (diffMins === 0) {
      return `Locks: in < 1 minute`;
    }
    if (diffMins === 1) {
      return `Locks: in 1 minute`;
    }
    return `Locks: in ${diffMins} minutes`;
  }

  const isToday = date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  const isTomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).getDate() === date.getDate() && new Date(now.getTime() + 24 * 60 * 60 * 1000).getMonth() === date.getMonth();

  const timeString = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  if (isToday) {
    return `Today @ ${timeString}`;
  } else if (isTomorrow) {
    return `Tomorrow @ ${timeString}`;
  } else {
    const dayString = date.toLocaleDateString([], { weekday: 'short' });
    return `${dayString} ${timeString}`;
  }
};
export const getSportFromLeague = (league: string): string => {
  if (["NBA", "WNBA", "MBB", "WBB", "NBASL"].includes(league))
    return "basketball";
  if (["NFL", "COLLEGE-FOOTBALL", "UFL", "CFB", "CFL"].includes(league)) return "football";
  if (["MLB"].includes(league)) return "baseball";
  if (["NHL"].includes(league)) return "hockey";
  if (
    ["MLS", "NWSL", "EPL", "RPL",
  "CFL",
  "LMX", "CSL", "ARG", "TUR", "FRIENDLY", "LMX", "FIFA", "FRA", "CHN"].includes(
      league
    )
  )
    return "soccer";
  if (["PLL"].includes(league)) return "lacrosse";

  return "other";
};

export const getLeagueColor = (league: string): string => {
  const index = ACTIVE_LEAGUES.indexOf(league);
  if (index === -1) {
    let hash = 0;
    for (let i = 0; i < league.length; i++) {
      hash = league.charCodeAt(i) + ((hash << 5) - hash);
    }
    return `var(--color-chart-${(Math.abs(hash) % 5) + 1})`;
  }
  return `var(--color-chart-${(index % 5) + 1})`;
};

export const ACTIVE_LEAGUES: string[] = [
  "NFL",
  "NBA",
  "MLB",
  "NHL",
  "COLLEGE-FOOTBALL",
  "MBB",
  "WBB",
  "WNBA",
  "MLS",
  "NWSL",
  "NBASL",
  "EPL",
  "UFL",
  "ARG",
  "TUR",
  "FRIENDLY",
  "CSL",
  "RPL",
  "CFL",
  "LMX",
];
