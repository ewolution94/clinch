import type { Lang } from "./settings";

/**
 * Interface copy, in both languages.
 *
 * Football vocabulary deliberately stays English — Wild Card, Bye, Touchdown,
 * Seed, Division. That isn't laziness: RTL, ran and every German NFL broadcast
 * use the English terms, and "Erstrunden-Freilos" for a bye reads as a
 * translation exercise rather than as how anyone talks about the sport. The
 * interface around them translates; the game's own words don't.
 *
 * Flat keys, one table, following PLANUM's lib/planner-translations.ts.
 */
export const STRINGS = {
  en: {
    /* chrome */
    tagline: "WHO'S IN, WHO'S OUT",
    views: "Views",
    live: "LIVE",
    settings: "Settings",
    close: "Close",

    /* routes */
    routeStandings: "Table",
    routeStandingsLong: "Standings",
    routeWeek: "Week",
    routeWeekLong: "Schedule",
    routePlayoffs: "Picture",
    routePlayoffsLong: "Playoff picture",
    routeBracket: "Bracket",
    routeBracketLong: "Bracket",

    /* loading + errors */
    loadingLeague: "Loading the league",
    loadingWeek: "Loading week",
    loadingGame: "Loading game detail",
    cantReach: "Can't reach the server",
    retrying: "RETRYING",
    staleData:
      "Showing the last good data — the league feed didn't answer on the most recent refresh.",
    gameFailed: "COULDN'T LOAD THIS GAME",

    /* standings */
    conference: "Conference",
    pointsFor: "Points for",
    winPct: "Win pct",
    next: "NEXT",
    noGamesYet: "No games played yet",
    noGamesPlayed: "No games played",

    /* week */
    backToThisWeek: "BACK TO THIS WEEK",
    scheduleOnly:
      "Schedule and results only — the standings and bracket always show where the season stands today.",
    onBye: "On bye",
    dateTbd: "Date to be confirmed",
    noEarlierWeek: "No earlier week",
    noLaterWeek: "No later week",
    games: "GAMES",
    nextWeek: "next week",
    lastWeek: "last week",
    weeksAhead: "weeks ahead",
    weeksBack: "weeks back",
    thisWeek: "THIS WEEK",

    /* playoff picture */
    inTheField: "IN THE FIELD",
    cutLine: "CUT LINE",
    stillAlive: "STILL ALIVE",
    eliminated: "ELIMINATED",
    seeds17: "SEEDS 1–7",
    teams: "TEAMS",

    /* bracket */
    ifSeasonEnded: "IF THE SEASON ENDED TODAY",
    wildCardRound: "WILD CARD ROUND",
    firstRoundBye: "FIRST-ROUND BYE",
    clearMyPicks: "CLEAR MY PICKS",
    pick: "PICK",
    pickHint: "Your prediction, not a result",
    gameDetail: "Game detail",
    reseeded:
      "RESEEDED — THE 1 SEED ALWAYS DRAWS THE LOWEST SURVIVOR, SO THESE LINES NO LONGER MATCH",
    bracketIntro:
      "The field as today's standings seed it. Later rounds stay empty until the games are actually played — nothing here assumes a winner. Tap a team to try a result of your own; the bracket reseeds after every round, exactly like the NFL does.",
    superBowl: "SUPER BOWL",
    neutralSite: "NEUTRAL SITE",

    /* game detail */
    team: "TEAM",
    byQuarter: "BY QUARTER",
    notKickedOff:
      "Quarter scores, scoring plays and team numbers appear here once the game kicks off.",

    /* statuses */
    statusClinchedBye: "Clinched bye",
    statusClinchedDivision: "Clinched division",
    statusClinched: "Clinched berth",
    statusIn: "In the field",
    statusBubble: "On the bubble",
    statusHunt: "In the hunt",
    statusLongshot: "Long shot",
    statusEliminated: "Eliminated",

    /* broadcasts */
    listingsNotOut: "German listings for this week aren't published yet",
    ofGamesOn: "of {total} games on {where}",
    moreCouldBe:
      "{n} more could be — RTL names its Sunday picks about a week ahead",

    /* settings */
    settingsTitle: "Settings",
    settingsHint: "Kept in this browser. Clinch has no account to sign in to.",
    theme: "Theme",
    themeDark: "Dark",
    themeLight: "Light",
    themeCreative: "Creative",
    themeHint: "Creative is the dark palette with the motion turned up.",
    language: "Language",
    opensOn: "Opens on",
    opensOnHint: "Which view Clinch shows when you arrive.",
    landingLast: "Where I left off",
    defaultConference: "Default conference",
    defaultConferenceHint: "Which one the standings show first on a phone.",
    conferenceLast: "Last one I picked",
    motion: "Motion",
    motionSystem: "System",
    motionFull: "Full",
    motionReduced: "Reduced",
    motionHint: "System follows your device's reduce-motion setting.",
    motionOverridesCreative:
      "Motion is set to reduced, so Creative keeps its palette but stays still.",
  },

  de: {
    /* chrome */
    tagline: "WER DRIN IST, WER DRAUSSEN IST",
    views: "Ansichten",
    live: "LIVE",
    settings: "Einstellungen",
    close: "Schließen",

    /* routes */
    routeStandings: "Tabelle",
    routeStandingsLong: "Tabelle",
    routeWeek: "Woche",
    routeWeekLong: "Spielplan",
    routePlayoffs: "Bild",
    routePlayoffsLong: "Playoff-Bild",
    routeBracket: "Bracket",
    routeBracketLong: "Bracket",

    /* loading + errors */
    loadingLeague: "Liga wird geladen",
    loadingWeek: "Woche wird geladen",
    loadingGame: "Spieldetails werden geladen",
    cantReach: "Server nicht erreichbar",
    retrying: "NEUER VERSUCH",
    staleData:
      "Es werden die letzten gültigen Daten gezeigt — der Liga-Feed hat beim letzten Abruf nicht geantwortet.",
    gameFailed: "SPIEL KONNTE NICHT GELADEN WERDEN",

    /* standings */
    conference: "Conference",
    pointsFor: "Punkte erzielt",
    winPct: "Siegquote",
    next: "NÄCHSTES",
    noGamesYet: "Noch keine Spiele",
    noGamesPlayed: "Keine Spiele gespielt",

    /* week */
    backToThisWeek: "ZURÜCK ZU DIESER WOCHE",
    scheduleOnly:
      "Nur Spielplan und Ergebnisse — Tabelle und Bracket zeigen immer den heutigen Stand.",
    onBye: "Bye",
    dateTbd: "Termin offen",
    noEarlierWeek: "Keine frühere Woche",
    noLaterWeek: "Keine spätere Woche",
    games: "SPIELE",
    nextWeek: "nächste Woche",
    lastWeek: "letzte Woche",
    weeksAhead: "Wochen voraus",
    weeksBack: "Wochen zurück",
    thisWeek: "DIESE WOCHE",

    /* playoff picture */
    inTheField: "IM FELD",
    cutLine: "CUT LINE",
    stillAlive: "NOCH IM RENNEN",
    eliminated: "AUSGESCHIEDEN",
    seeds17: "SEEDS 1–7",
    teams: "TEAMS",

    /* bracket */
    ifSeasonEnded: "WENN DIE SAISON HEUTE ENDEN WÜRDE",
    wildCardRound: "WILD CARD ROUND",
    firstRoundBye: "FIRST-ROUND BYE",
    clearMyPicks: "MEINE TIPPS LÖSCHEN",
    pick: "TIPP",
    pickHint: "Dein Tipp, kein Ergebnis",
    gameDetail: "Spieldetails",
    reseeded:
      "NEU GESETZT — DER 1 SEED TRIFFT IMMER AUF DEN NIEDRIGSTEN VERBLIEBENEN, DIESE LINIEN PASSEN DAHER NICHT MEHR",
    bracketIntro:
      "Das Feld, wie es die heutige Tabelle setzt. Spätere Runden bleiben leer, bis die Spiele tatsächlich stattgefunden haben — hier wird kein Sieger angenommen. Tippe auf ein Team, um ein eigenes Ergebnis zu setzen; das Bracket wird nach jeder Runde neu gesetzt, genau wie in der NFL.",
    superBowl: "SUPER BOWL",
    neutralSite: "NEUTRALER ORT",

    /* game detail */
    team: "TEAM",
    byQuarter: "NACH VIERTELN",
    notKickedOff:
      "Viertel-Ergebnisse, Scoring-Plays und Team-Werte erscheinen hier, sobald das Spiel angepfiffen ist.",

    /* statuses */
    statusClinchedBye: "Bye sicher",
    statusClinchedDivision: "Division sicher",
    statusClinched: "Playoffs sicher",
    statusIn: "Im Feld",
    statusBubble: "Auf der Kippe",
    statusHunt: "Noch im Rennen",
    statusLongshot: "Außenseiter",
    statusEliminated: "Ausgeschieden",

    /* broadcasts */
    listingsNotOut: "Das TV-Programm für diese Woche steht noch nicht fest",
    ofGamesOn: "von {total} Spielen auf {where}",
    moreCouldBe:
      "{n} weitere könnten dazukommen — RTL legt seine Sonntagsspiele etwa eine Woche vorher fest",

    /* settings */
    settingsTitle: "Einstellungen",
    settingsHint:
      "Wird nur in diesem Browser gespeichert. Clinch hat kein Benutzerkonto.",
    theme: "Design",
    themeDark: "Dunkel",
    themeLight: "Hell",
    themeCreative: "Kreativ",
    themeHint: "Kreativ ist das dunkle Design mit mehr Bewegung.",
    language: "Sprache",
    opensOn: "Startansicht",
    opensOnHint: "Welche Ansicht Clinch beim Öffnen zeigt.",
    landingLast: "Wo ich aufgehört habe",
    defaultConference: "Standard-Conference",
    defaultConferenceHint: "Welche die Tabelle auf dem Handy zuerst zeigt.",
    conferenceLast: "Zuletzt gewählte",
    motion: "Bewegung",
    motionSystem: "System",
    motionFull: "Voll",
    motionReduced: "Reduziert",
    motionHint: "System folgt der Einstellung deines Geräts.",
    motionOverridesCreative:
      "Bewegung steht auf reduziert — Kreativ behält seine Farben, bleibt aber ruhig.",
  },
} as const;

export type StringKey = keyof (typeof STRINGS)["en"];
export type Strings = Record<StringKey, string>;

/**
 * Every language must define every key, checked at compile time — a missing
 * German string should be a build error, not an English word appearing
 * mid-sentence at runtime.
 */
const COMPLETE: Record<Lang, Strings> = STRINGS;

export function stringsFor(lang: Lang): Strings {
  return COMPLETE[lang];
}
