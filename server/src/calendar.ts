import type { GameDetail, ScoreboardGame } from "./types.js";

/**
 * One game as an iCalendar file (RFC 5545).
 *
 * Served rather than built in the browser, and that is an iPhone decision:
 * Safari only offers "Add to Calendar" for a real `text/calendar` response. A
 * file assembled client-side and handed over as a download lands in Files
 * instead, which is no use to anyone holding a phone.
 *
 * Times go out in UTC, so every calendar shows them in its own zone; the
 * description spells them out in German time, because that's what the channel
 * listings are in and what the reader will be comparing against.
 */

/** Long enough for a regular-season game with the usual stoppages. */
const GAME_LENGTH_MS = (3 * 60 + 15) * 60_000;

const COPY = {
  en: {
    liveOn: (outlets: string, time: string) => `Live on ${outlets} from ${time}`,
    maybeOn: (outlet: string) => `${outlet} may pick this game — not announced yet`,
    kickoff: (time: string) => `Kickoff ${time} German time`,
    or: " or ",
  },
  de: {
    liveOn: (outlets: string, time: string) => `Live auf ${outlets} ab ${time} Uhr`,
    maybeOn: (outlet: string) => `${outlet} könnte dieses Spiel zeigen — noch nicht angekündigt`,
    kickoff: (time: string) => `Kickoff ${time} Uhr deutscher Zeit`,
    or: " oder ",
  },
};

function berlinTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("de-DE", {
    timeZone: "Europe/Berlin",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** 20260927T202500Z */
function stamp(ms: number): string {
  return new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Lines longer than 75 octets continue on the next line after a space. */
function fold(line: string): string {
  const out: string[] = [];
  let current = "";
  let octets = 0;
  for (const char of line) {
    const size = Buffer.byteLength(char);
    if (octets + size > 75) {
      out.push(current);
      current = " ";
      octets = 1;
    }
    current += char;
    octets += size;
  }
  out.push(current);
  return out.join("\r\n");
}

export function gameCalendar({
  detail,
  game,
  lang,
  origin,
}: {
  detail: GameDetail;
  /** The scoreboard entry, carrying the German broadcast when there is one. */
  game: ScoreboardGame | undefined;
  lang: "en" | "de";
  origin: string;
}): { filename: string; body: string } {
  const copy = COPY[lang];
  const [away, home] = detail.teams;
  const start = Date.parse(detail.kickoff);
  const link = `${origin}/?game=${detail.id}`;

  const broadcast = game?.broadcast;
  const confirmed =
    broadcast?.status === "confirmed" && broadcast.slots.length > 0 ? broadcast : null;
  const outlets = confirmed ? [...new Set(confirmed.slots.map((s) => s.outlet))] : [];
  const onFrom = confirmed ? confirmed.slots.map((s) => s.startsAt).sort()[0] : null;

  const venue = detail.venue
    ? [detail.venue.name, detail.venue.city, detail.venue.country === "USA" ? "" : detail.venue.country]
        .filter(Boolean)
        .join(", ")
    : "";

  const description = [
    confirmed && onFrom ? copy.liveOn(outlets.join(copy.or), berlinTime(onFrom)) : null,
    broadcast?.status === "candidate" ? copy.maybeOn(broadcast.pendingOutlet ?? "RTL") : null,
    copy.kickoff(berlinTime(detail.kickoff)),
    venue || null,
    link,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Clinch//NFL//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    // Stable per game, so adding it twice updates the entry instead of doubling it.
    `UID:game-${detail.id}@clinch`,
    `DTSTAMP:${stamp(Date.now())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(start + GAME_LENGTH_MS)}`,
    `SUMMARY:${escapeText(`🏈 ${away.location} ${away.name} @ ${home.location} ${home.name}`)}`,
    // Where you'll actually watch it, when that's known; otherwise the stadium.
    `LOCATION:${escapeText(outlets.length ? outlets.join(" · ") : venue)}`,
    `DESCRIPTION:${escapeText(description)}`,
    `URL:${link}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return {
    filename: `clinch-${away.abbr}-${home.abbr}.ics`.toLowerCase(),
    body: `${lines.map(fold).join("\r\n")}\r\n`,
  };
}
