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

    /* routes — one label per view, at every width. The nav scrolls sideways
       when they don't all fit, rather than abbreviating them down to fit an
       arbitrary phone. */
    routeStandings: "Standings",
    routeWeek: "Week Schedule",
    routeTeam: "Team Schedule",
    routePlayoffs: "In the Field",
    routeBracket: "Playoffs",

    /* team schedule */
    teamSchedule: "A TEAM'S SEASON",
    pickTeam: "Pick a team",
    teamScheduleFailed: "Couldn't load that team's schedule",
    teamScheduleEmpty: "Pick a team above to see their whole season — every game played, every game still to come.",
    teamFavouriteHint: "No favourite team yet. Set one and this view opens on it.",
    openSettings: "Open settings",
    byeWeek: "BYE",
    nextUp: "NEXT",
    played: "PLAYED",
    toCome: "TO COME",

    /* how the schedule is made */
    scheduleHowTitle: "HOW THE SCHEDULE IS MADE",
    scheduleHowRules: [
      {
        title: "Six in your own division",
        body: "Two against each of the three teams you share a division with, one home and one away. More than a third of the season before anything else is decided.",
      },
      {
        title: "Two whole divisions",
        body: "Four games against every team in one other division in your conference, and four against every team in one division of the other. Both rotate — three years to come round inside a conference, four across them — so every team meets all thirty-one others within four years.",
      },
      {
        title: "Three from last year's table",
        body: "Two against the teams that finished where you did, in your conference's two remaining divisions, and one more against a same-place finisher from the other conference. It is how the league evens out who gets the hard year.",
      },
      {
        title: "Nine home games, or eight",
        body: "Seventeen won't split evenly, so one conference hosts nine and the other eight, and they swap each year. Which day and kickoff each game lands on is settled separately with the broadcasters, and some late-season games still move.",
      },
    ],
    scheduleHowSource: "The NFL publishes this formula; nothing here is read off the fixtures.",

    applyLiveScores: "APPLY LIVE SCORES",
    liveScoresOn: "LIVE SCORES APPLIED",
    liveScoresNote:
      "The table counts games in progress as if they ended now. Records and seeds move with the score; teams that come out level keep the order the NFL's tiebreakers already gave them, which the real result may not.",
    refresh: "Refresh",
    refreshing: "Refreshing",

    /* season archive */
    season: "Season",
    thisSeason: "This season",
    archive: "ARCHIVE",
    archiveNote:
      "The {year} season, finished — final table, every result, and the bracket as it was played.",
    backToCurrent: "BACK TO THIS SEASON",
    archiveFailed: "Couldn't load that season",

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
    home: "Home",
    away: "Away",
    pointsFor: "Points for",
    pointsAgainst: "Against",
    pointDiff: "Point diff",
    winPct: "Win pct",
    lastN: "LAST {n}",
    inProgress: "in progress",
    gameBack: "{n} game back of the 7 seed",
    gamesBack: "{n} games back of the 7 seed",
    toPlay: "{n} to play",
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
    yourTeam: "YOUR TEAM",
    onByeThisWeek: "On bye this week",
    filterAll: "All games",
    filterTv: "On TV",
    noneOnTv: "Nothing on {where} this week yet.",

    /* playoff picture */
    inTheField: "IN THE FIELD",
    cutLine: "CUT LINE",
    stillAlive: "STILL ALIVE",
    eliminated: "ELIMINATED",
    teams: "TEAMS",

    /* bracket */
    wildCardRound: "WILD CARD ROUND",
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
    addToGoogleCalendar: "Google Calendar",
    addToCalendar: "Add to calendar",
    icsHint:
      "Safari adds it straight away. Other browsers save the file — open it from your downloads to add it.",

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
    ofGameOn: "of {total} game on {where}",
    ofGamesOn: "of {total} games on {where}",
    or: "or",
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
    favouriteTeam: "Favourite team",
    favouriteHint: "Starred wherever it appears, and its game leads the schedule.",
    favouriteNone: "None",
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
    routeWeek: "Wochen-Spielplan",
    routeTeam: "Team-Spielplan",
    routePlayoffs: "Im Feld",
    routeBracket: "Playoffs",

    /* team schedule */
    teamSchedule: "EINE SAISON, EIN TEAM",
    pickTeam: "Team auswählen",
    teamScheduleFailed: "Der Spielplan dieses Teams konnte nicht geladen werden",
    teamScheduleEmpty: "Oben ein Team auswählen und die ganze Saison sehen — jedes gespielte Spiel und jedes, das noch kommt.",
    teamFavouriteHint: "Noch kein Lieblingsteam. Leg eins fest, dann öffnet diese Ansicht damit.",
    openSettings: "Zu den Optionen",
    byeWeek: "BYE",
    nextUp: "NÄCHSTES",
    played: "GESPIELT",
    toCome: "AUSSTEHEND",

    /* how the schedule is made */
    scheduleHowTitle: "WIE DER SPIELPLAN ENTSTEHT",
    scheduleHowRules: [
      {
        title: "Sechs in der eigenen Division",
        body: "Zwei gegen jedes der drei Teams der eigenen Division, eines zu Hause, eines auswärts. Mehr als ein Drittel der Saison steht damit fest, bevor irgendetwas anderes entschieden ist.",
      },
      {
        title: "Zwei komplette Divisions",
        body: "Vier Spiele gegen alle Teams einer anderen Division der eigenen Conference, vier gegen alle einer Division der anderen. Beide rotieren — drei Jahre innerhalb einer Conference, vier über beide hinweg — so trifft jedes Team binnen vier Jahren auf alle anderen einunddreißig.",
      },
      {
        title: "Drei aus der Vorsaison",
        body: "Zwei gegen die Teams, die denselben Platz belegt haben, aus den beiden übrigen Divisions der eigenen Conference, und eines gegen ein platzgleiches Team der anderen Conference. So gleicht die Liga aus, wer das schwere Jahr erwischt.",
      },
      {
        title: "Neun Heimspiele, oder acht",
        body: "Siebzehn lassen sich nicht gleichmäßig teilen: Eine Conference hat neun Heimspiele, die andere acht, im nächsten Jahr umgekehrt. Tag und Uhrzeit legt die Liga getrennt davon mit den Übertragungspartnern fest, einzelne späte Spiele werden noch verlegt.",
      },
    ],
    scheduleHowSource: "Die NFL veröffentlicht diese Formel; nichts davon ist aus den Spielplänen abgeleitet.",

    applyLiveScores: "LIVE-ERGEBNISSE ANWENDEN",
    liveScoresOn: "LIVE-ERGEBNISSE ANGEWENDET",
    liveScoresNote:
      "Die Tabelle zählt laufende Spiele so, als wären sie jetzt zu Ende. Bilanzen und Seeds bewegen sich mit dem Spielstand; punktgleiche Teams behalten die Reihenfolge, die die NFL-Tiebreaker bereits ergeben haben — das echte Ergebnis kann anders ausfallen.",
    refresh: "Aktualisieren",
    refreshing: "Wird aktualisiert",

    /* season archive */
    season: "Saison",
    thisSeason: "Aktuelle Saison",
    archive: "ARCHIV",
    archiveNote:
      "Die Saison {year}, abgeschlossen — Endtabelle, alle Ergebnisse und der Bracket, wie er gespielt wurde.",
    backToCurrent: "ZURÜCK ZUR AKTUELLEN SAISON",
    archiveFailed: "Diese Saison konnte nicht geladen werden",

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
    home: "Heim",
    away: "Auswärts",
    pointsFor: "Punkte erzielt",
    pointsAgainst: "Punkte kassiert",
    pointDiff: "Differenz",
    winPct: "Siegquote",
    lastN: "LETZTE {n}",
    inProgress: "läuft",
    gameBack: "{n} Spiel hinter dem 7 Seed",
    gamesBack: "{n} Spiele hinter dem 7 Seed",
    toPlay: "noch {n} offen",
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
    yourTeam: "DEIN TEAM",
    onByeThisWeek: "Diese Woche spielfrei",
    filterAll: "Alle Spiele",
    filterTv: "Im TV",
    noneOnTv: "Diese Woche noch nichts auf {where}.",

    /* playoff picture */
    inTheField: "IM FELD",
    cutLine: "CUT LINE",
    stillAlive: "NOCH IM RENNEN",
    eliminated: "AUSGESCHIEDEN",
    teams: "TEAMS",

    /* bracket */
    wildCardRound: "WILD CARD ROUND",
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
    addToGoogleCalendar: "Google Kalender",
    addToCalendar: "Zum Kalender hinzufügen",
    icsHint:
      "Safari trägt es direkt ein. Andere Browser speichern die Datei — zum Eintragen in den Downloads öffnen.",

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
    ofGameOn: "von {total} Spiel auf {where}",
    ofGamesOn: "von {total} Spielen auf {where}",
    or: "oder",
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
    favouriteTeam: "Lieblingsteam",
    favouriteHint: "Überall mit Stern markiert, sein Spiel steht im Spielplan oben.",
    favouriteNone: "Keins",
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

/**
 * Each key keeps the *shape* English gave it — almost all are a string, and the
 * few that are a list stay a list. Written as a mapped type rather than
 * `Record<StringKey, string>` so a list doesn't force every other key to widen
 * into `string | string[]` at the call site.
 */
/** A titled paragraph, as the expandable info sections are built from. */
export interface RuleCopy {
  readonly title: string;
  readonly body: string;
}

/**
 * Each key keeps the *kind* English gave it — almost all are a string, and the
 * few that are a list of titled paragraphs stay that. Written as a mapped type
 * rather than `Record<StringKey, string>` so one list doesn't widen every other
 * key into a union at the call site.
 */
export type Strings = {
  readonly [K in StringKey]: (typeof STRINGS)["en"][K] extends string
    ? string
    : readonly RuleCopy[];
};

/**
 * The keys that hold a plain string. Anything looking a key up dynamically
 * should use this rather than `StringKey`, or the result widens to include the
 * few entries that are lists and stops being renderable on its own.
 */
export type TextKey = {
  [K in StringKey]: Strings[K] extends string ? K : never;
}[StringKey];

/**
 * Every language must define every key, checked at compile time — a missing
 * German string should be a build error, not an English word appearing
 * mid-sentence at runtime.
 */
const COMPLETE: Record<Lang, Strings> = STRINGS;

export function stringsFor(lang: Lang): Strings {
  return COMPLETE[lang];
}
