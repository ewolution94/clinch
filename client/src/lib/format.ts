export function formatDiff(diff: number): string {
  return diff > 0 ? `+${diff}` : String(diff);
}

export function formatPct(pct: number): string {
  return pct.toFixed(3).replace(/^0/, "");
}

/** Half-games are real in the NFL (a tie is half a win); whole ones aren't "2.0". */
export function formatGames(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function formatKickoff(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString(undefined, {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function formatClock(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function logoUrl(abbr: string): string {
  return `/logos/${abbr.toLowerCase()}.webp`;
}
