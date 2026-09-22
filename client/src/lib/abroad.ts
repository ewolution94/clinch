import type { GameAbroad } from "./types";
import type { Lang } from "./settings";

/**
 * ESPN writes venues the way a US scoreboard would: English names, and the
 * municipality rather than the city people know the game by. These tables
 * cover every country the league has played in; anything new still shows,
 * just without a flag and in ESPN's spelling.
 */
const COUNTRIES: Record<string, { code: string; de: string }> = {
  Australia: { code: "AU", de: "Australien" },
  Brazil: { code: "BR", de: "Brasilien" },
  Canada: { code: "CA", de: "Kanada" },
  England: { code: "GB", de: "England" },
  France: { code: "FR", de: "Frankreich" },
  Germany: { code: "DE", de: "Deutschland" },
  Ireland: { code: "IE", de: "Irland" },
  Italy: { code: "IT", de: "Italien" },
  Mexico: { code: "MX", de: "Mexiko" },
  Spain: { code: "ES", de: "Spanien" },
  "United Kingdom": { code: "GB", de: "Großbritannien" },
};

/** The Stade de France is in Saint-Denis; the NFL sells it as the Paris game. */
const CITY_NAMES: Record<string, string> = {
  "Saint-Denis": "Paris",
  "Rio De Janeiro": "Rio de Janeiro",
};

const CITY_NAMES_DE: Record<string, string> = {
  Munich: "München",
  "Mexico City": "Mexiko-Stadt",
  Rome: "Rom",
  Cologne: "Köln",
};

/** Two regional-indicator letters make a flag, wherever the font has one. */
function flagFor(code: string): string {
  return [...code].map((c) => String.fromCodePoint(0x1f1a5 + c.charCodeAt(0))).join("");
}

export function abroadLabel(
  abroad: GameAbroad,
  lang: Lang,
): { flag: string; city: string; country: string } {
  const known = COUNTRIES[abroad.country];
  const city = CITY_NAMES[abroad.city] ?? abroad.city;
  return {
    flag: known ? flagFor(known.code) : "",
    city: lang === "de" ? (CITY_NAMES_DE[city] ?? city) : city,
    country: lang === "de" && known ? known.de : abroad.country,
  };
}
