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

/** Super Bowl I followed the 1966 season, and they've counted up ever since. */
export function superBowlNumeral(seasonYear: number): string {
  let left = seasonYear - 1965;
  if (left < 1) return "";
  const table: [number, string][] = [
    [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"],
    [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
  ];
  let out = "";
  for (const [value, symbol] of table) {
    while (left >= value) {
      out += symbol;
      left -= value;
    }
  }
  return out;
}
