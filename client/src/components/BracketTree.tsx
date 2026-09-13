import { useCallback, useMemo, useState } from "react";
import { clsx } from "clsx";
import { BracketConnectors } from "./BracketConnectors";
import { BracketMatchCard, ByeCard } from "./BracketMatchCard";
import { SuperBowlCard } from "./SuperBowlCard";
import { buildBracket, type ConferenceBracket, type Picks } from "../lib/bracket";
import { superBowlNumeral } from "../lib/format";
import type { ConferenceView, Snapshot } from "../lib/types";

interface BracketTreeProps {
  snapshot: Snapshot;
}

/** One round's column: matches spread evenly so the connector maths holds. */
function Round({ children }: { children: React.ReactNode[] }) {
  return (
    <div className="flex h-full flex-col justify-around">
      {children.map((child, i) => (
        <div key={i} className="flex flex-1 items-center">
          <div className="w-full">{child}</div>
        </div>
      ))}
    </div>
  );
}

function RoundLabel({ children, muted }: { children: string; muted?: boolean }) {
  return (
    <span
      className={clsx(
        "block text-center font-mono text-[9px] tracking-[0.18em]",
        muted ? "text-mist/60" : "text-mist"
      )}
    >
      {children}
    </span>
  );
}

function ReseedNote() {
  return (
    <p className="mt-1 rounded-md border border-pylon/25 bg-pylon/8 px-2 py-1 text-center font-mono text-[8.5px] leading-relaxed tracking-[0.08em] text-pylon">
      RESEEDED — THE 1 SEED ALWAYS DRAWS THE LOWEST SURVIVOR, SO THESE LINES NO LONGER MATCH
    </p>
  );
}

/** The stacked view: a phone can't take a mirrored tree, so rounds flow down. */
function ConferencePath({
  bracket,
  conference,
  onPick,
}: {
  bracket: ConferenceBracket;
  conference: ConferenceView;
  onPick: (matchId: string, abbr: string) => void;
}) {
  const tint = bracket.conference === "AFC" ? "var(--color-pylon)" : "var(--color-jade)";

  return (
    <section className="flex flex-col gap-2.5">
      <h3
        className="font-display text-[26px] leading-none font-bold tracking-[-0.02em]"
        style={{
          background: `linear-gradient(180deg, var(--color-paper) 30%, color-mix(in srgb, ${tint} 65%, var(--color-paper)) 100%)`,
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
        }}
      >
        {conference.id}
      </h3>

      <RoundLabel>WILD CARD</RoundLabel>
      <div className="flex flex-col gap-1.5">
        <ByeCard team={bracket.bye} />
        {bracket.wildcard.map((m) => (
          <BracketMatchCard key={m.id} match={m} onPick={onPick} />
        ))}
      </div>

      <span aria-hidden="true" className="mx-auto h-4 w-px bg-line" />
      <RoundLabel>DIVISIONAL</RoundLabel>
      {bracket.reseeded && <ReseedNote />}
      <div className="flex flex-col gap-1.5">
        {bracket.divisional.map((m) => (
          <BracketMatchCard key={m.id} match={m} onPick={onPick} />
        ))}
      </div>

      <span aria-hidden="true" className="mx-auto h-4 w-px bg-line" />
      <RoundLabel>{`${bracket.conference} CHAMPIONSHIP`}</RoundLabel>
      {bracket.championship && <BracketMatchCard match={bracket.championship} onPick={onPick} size="lg" />}
    </section>
  );
}

/** Each arm is lit by the team that travels along it into the next round. */
function wildCardArms(bracket: ConferenceBracket): (string | undefined)[] {
  return [bracket.bye?.accent, ...bracket.wildcard.map((m) => m.winner?.accent)];
}

function divisionalArms(bracket: ConferenceBracket): (string | undefined)[] {
  return bracket.divisional.map((m) => m.winner?.accent);
}

// Seven round columns with connector gutters between them. The middle column
// gets a floor as well as a share, because the Super Bowl card carries the most
// content and is the one that breaks first when the window narrows.
const COLUMNS =
  "minmax(0,1fr) 26px minmax(0,1fr) 26px minmax(0,1fr) 30px minmax(210px,1.5fr) 30px minmax(0,1fr) 26px minmax(0,1fr) 26px minmax(0,1fr)";

export function BracketTree({ snapshot }: BracketTreeProps) {
  const [picks, setPicks] = useState<Picks>({});

  const bracket = useMemo(() => buildBracket(snapshot.conferences, picks), [snapshot.conferences, picks]);
  const afc = bracket.conferences.find((c) => c.conference === "AFC");
  const nfc = bracket.conferences.find((c) => c.conference === "NFC");
  const afcView = snapshot.conferences.find((c) => c.id === "AFC");
  const nfcView = snapshot.conferences.find((c) => c.id === "NFC");

  const onPick = useCallback((matchId: string, abbr: string) => {
    setPicks((prev) => (prev[matchId] === abbr ? prev : { ...prev, [matchId]: abbr }));
  }, []);

  const hasPicks = Object.keys(picks).length > 0;
  if (!afc || !nfc || !afcView || !nfcView) return null;

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="font-display text-[clamp(30px,5vw,46px)] leading-none font-bold tracking-[-0.03em] text-paper">
            The road to {superBowlShort(snapshot.season.year)}
          </h2>
          <p className="font-display text-[12px] text-mist">
            Seeded on today&apos;s standings, with the higher seed advancing. Tap any team to send them through — the
            bracket reseeds after every round, exactly like the NFL does.
          </p>
        </div>
        {hasPicks && (
          <button
            type="button"
            onClick={() => setPicks({})}
            className="shrink-0 rounded-full border border-line bg-ink/70 px-3.5 py-1.5 font-mono text-[10px] tracking-[0.14em] text-mist transition-colors hover:border-pylon/40 hover:text-pylon"
          >
            RESET
          </button>
        )}
      </header>

      {/* Phones: the Super Bowl first as the headline, then each path down. */}
      <div className="flex flex-col gap-6 lg:hidden">
        <SuperBowlCard match={bracket.superBowl} seasonYear={snapshot.season.year} onPick={onPick} compact />
        <ConferencePath bracket={afc} conference={afcView} onPick={onPick} />
        <ConferencePath bracket={nfc} conference={nfcView} onPick={onPick} />
      </div>

      {/* Desktop: the real thing — both halves closing on the middle. */}
      <div className="hidden lg:block">
        <div className="grid items-end gap-y-2 pb-2" style={{ gridTemplateColumns: COLUMNS }}>
          <RoundLabel>WILD CARD</RoundLabel>
          <span />
          <RoundLabel>DIVISIONAL</RoundLabel>
          <span />
          <RoundLabel>AFC TITLE</RoundLabel>
          <span />
          <span />
          <span />
          <RoundLabel>NFC TITLE</RoundLabel>
          <span />
          <RoundLabel>DIVISIONAL</RoundLabel>
          <span />
          <RoundLabel>WILD CARD</RoundLabel>
        </div>

        <div
          className="grid h-[clamp(520px,64vh,780px)]"
          style={{ gridTemplateColumns: COLUMNS }}
        >
          <Round>
            {[
              <ByeCard key="bye" team={afc.bye} />,
              ...afc.wildcard.map((m) => <BracketMatchCard key={m.id} match={m} onPick={onPick} />),
            ]}
          </Round>
          <BracketConnectors incoming={4} flow="right" arms={wildCardArms(afc)} />
          <Round>
            {afc.divisional.map((m) => (
              <BracketMatchCard key={m.id} match={m} onPick={onPick} />
            ))}
          </Round>
          <BracketConnectors incoming={2} flow="right" arms={divisionalArms(afc)} />
          <Round>
            {afc.championship ? [<BracketMatchCard key="cf" match={afc.championship} onPick={onPick} size="lg" />] : []}
          </Round>
          <BracketConnectors incoming={1} flow="right" arms={[afc.champion?.accent]} />

          <div className="flex items-center px-1">
            <div className="w-full">
              <SuperBowlCard match={bracket.superBowl} seasonYear={snapshot.season.year} onPick={onPick} />
            </div>
          </div>

          <BracketConnectors incoming={1} flow="left" arms={[nfc.champion?.accent]} />
          <Round>
            {nfc.championship
              ? [<BracketMatchCard key="cf" match={nfc.championship} onPick={onPick} mirrored size="lg" />]
              : []}
          </Round>
          <BracketConnectors incoming={2} flow="left" arms={divisionalArms(nfc)} />
          <Round>
            {nfc.divisional.map((m) => (
              <BracketMatchCard key={m.id} match={m} onPick={onPick} mirrored />
            ))}
          </Round>
          <BracketConnectors incoming={4} flow="left" arms={wildCardArms(nfc)} />
          <Round>
            {[
              <ByeCard key="bye" team={nfc.bye} mirrored />,
              ...nfc.wildcard.map((m) => <BracketMatchCard key={m.id} match={m} onPick={onPick} mirrored />),
            ]}
          </Round>
        </div>

        {(afc.reseeded || nfc.reseeded) && (
          <div className="mx-auto mt-3 max-w-xl">
            <ReseedNote />
          </div>
        )}
      </div>
    </div>
  );
}

function superBowlShort(seasonYear: number): string {
  const numeral = superBowlNumeral(seasonYear);
  return numeral ? `Super Bowl ${numeral}` : "the Super Bowl";
}
