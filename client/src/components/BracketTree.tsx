import { useCallback, useMemo, useState } from "react";
import { clsx } from "clsx";
import { BracketConnectors } from "./BracketConnectors";
import { BracketMatchCard, ByeCard } from "./BracketMatchCard";
import { SuperBowlCard } from "./SuperBowlCard";
import {
  buildBracket,
  type ConferenceBracket,
  type Picks,
} from "../lib/bracket";
import { superBowlNumeral } from "../lib/format";
import type { ConferenceView, Snapshot } from "../lib/types";

interface BracketTreeProps {
  snapshot: Snapshot;
  onOpenGame: (id: string) => void;
  morphCardId: string | null;
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

function RoundLabel({
  children,
  muted,
}: {
  children: string;
  muted?: boolean;
}) {
  return (
    <span
      className={clsx(
        "block text-center font-mono text-[12px] tracking-[0.18em]",
        muted ? "text-mist/60" : "text-mist",
      )}
    >
      {children}
    </span>
  );
}

function ReseedNote() {
  return (
    <p className="mt-1 rounded-md border border-brand/25 bg-brand/8 px-2 py-1 text-center font-mono text-[11.5px] leading-relaxed tracking-[0.08em] text-brand">
      RESEEDED — THE 1 SEED ALWAYS DRAWS THE LOWEST SURVIVOR, SO THESE LINES NO
      LONGER MATCH
    </p>
  );
}

/** Nothing advances on its own any more, so the arms light up only as rounds
    are actually settled — by a played game or by the reader's own pick. */
function accentOf(
  team: { accent: string } | null | undefined,
): string | undefined {
  return team?.accent;
}

/** The stacked view: a phone can't take a mirrored tree, so rounds flow down. */
function ConferencePath({
  bracket,
  conference,
  onPick,
  onOpenGame,
  morphCardId,
}: {
  bracket: ConferenceBracket;
  conference: ConferenceView;
  onPick: (matchId: string, abbr: string) => void;
  onOpenGame: (id: string) => void;
  morphCardId: string | null;
}) {
  const tint =
    bracket.conference === "AFC" ? "var(--color-brand)" : "var(--color-jade)";

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
          <BracketMatchCard
            key={m.id}
            match={m}
            onPick={onPick}
            onOpenGame={onOpenGame}
            morphCardId={morphCardId}
          />
        ))}
      </div>

      <span aria-hidden="true" className="mx-auto h-4 w-px bg-line" />
      <RoundLabel>DIVISIONAL</RoundLabel>
      {bracket.reseeded && <ReseedNote />}
      <div className="flex flex-col gap-1.5">
        {bracket.divisional.map((m) => (
          <BracketMatchCard
            key={m.id}
            match={m}
            onPick={onPick}
            onOpenGame={onOpenGame}
            morphCardId={morphCardId}
          />
        ))}
      </div>

      <span aria-hidden="true" className="mx-auto h-4 w-px bg-line" />
      <RoundLabel>{`${bracket.conference} CHAMPIONSHIP`}</RoundLabel>
      {bracket.championship && (
        <BracketMatchCard
          match={bracket.championship}
          onPick={onPick}
          onOpenGame={onOpenGame}
          morphCardId={morphCardId}
          size="lg"
        />
      )}
    </section>
  );
}

/** Each arm is lit by the team that travels along it into the next round. */
function wildCardArms(bracket: ConferenceBracket): (string | undefined)[] {
  return [
    accentOf(bracket.bye),
    ...bracket.wildcard.map((m) => accentOf(m.winner)),
  ];
}

function divisionalArms(bracket: ConferenceBracket): (string | undefined)[] {
  return bracket.divisional.map((m) => accentOf(m.winner));
}

// Seven round columns with connector gutters between them. The middle column
// gets a floor as well as a share, because the Super Bowl card carries the most
// content and is the one that breaks first when the window narrows.
const COLUMNS =
  "minmax(0,1fr) 26px minmax(0,1fr) 26px minmax(0,1fr) 30px minmax(210px,1.5fr) 30px minmax(0,1fr) 26px minmax(0,1fr) 26px minmax(0,1fr)";

export function BracketTree({
  snapshot,
  onOpenGame,
  morphCardId,
}: BracketTreeProps) {
  const [picks, setPicks] = useState<Picks>({});

  const bracket = useMemo(
    () => buildBracket(snapshot.conferences, snapshot.postseason, picks),
    [snapshot.conferences, snapshot.postseason, picks],
  );
  const afc = bracket.conferences.find((c) => c.conference === "AFC");
  const nfc = bracket.conferences.find((c) => c.conference === "NFC");
  const afcView = snapshot.conferences.find((c) => c.id === "AFC");
  const nfcView = snapshot.conferences.find((c) => c.id === "NFC");

  const onPick = useCallback((matchId: string, abbr: string) => {
    setPicks((prev) =>
      prev[matchId] === abbr ? prev : { ...prev, [matchId]: abbr },
    );
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
          <p className="max-w-2xl font-display text-[14.5px] leading-relaxed text-mist">
            The field as today&apos;s standings seed it. Later rounds stay empty
            until the games are actually played — nothing here assumes a winner.
            Tap a team to try a result of your own; the bracket reseeds after
            every round, exactly like the NFL does.
          </p>
        </div>
        {hasPicks && (
          <button
            type="button"
            onClick={() => setPicks({})}
            className="shrink-0 rounded-full border border-brand/35 bg-brand/10 px-3.5 py-1.5 font-mono text-[13px] tracking-[0.14em] text-brand transition-colors hover:bg-brand/18"
          >
            CLEAR MY PICKS
          </button>
        )}
      </header>

      {/* Phones: the Super Bowl first as the headline, then each path down. */}
      <div className="flex flex-col gap-6 lg:hidden">
        <SuperBowlCard
          match={bracket.superBowl}
          seasonYear={snapshot.season.year}
          onPick={onPick}
          compact
        />
        <ConferencePath
          bracket={afc}
          conference={afcView}
          onPick={onPick}
          onOpenGame={onOpenGame}
          morphCardId={morphCardId}
        />
        <ConferencePath
          bracket={nfc}
          conference={nfcView}
          onPick={onPick}
          onOpenGame={onOpenGame}
          morphCardId={morphCardId}
        />
      </div>

      {/* Desktop: the real thing — both halves closing on the middle. */}
      <div className="hidden lg:block">
        <div
          className="grid items-end gap-y-2 pb-2"
          style={{ gridTemplateColumns: COLUMNS }}
        >
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
              ...afc.wildcard.map((m) => (
                <BracketMatchCard
                  key={m.id}
                  match={m}
                  onPick={onPick}
                  onOpenGame={onOpenGame}
                  morphCardId={morphCardId}
                />
              )),
            ]}
          </Round>
          <BracketConnectors
            incoming={4}
            flow="right"
            arms={wildCardArms(afc)}
          />
          <Round>
            {afc.divisional.map((m) => (
              <BracketMatchCard
                key={m.id}
                match={m}
                onPick={onPick}
                onOpenGame={onOpenGame}
                morphCardId={morphCardId}
              />
            ))}
          </Round>
          <BracketConnectors
            incoming={2}
            flow="right"
            arms={divisionalArms(afc)}
          />
          <Round>
            {afc.championship
              ? [
                  <BracketMatchCard
                    key="cf"
                    match={afc.championship}
                    onPick={onPick}
                    onOpenGame={onOpenGame}
                    morphCardId={morphCardId}
                    size="lg"
                  />,
                ]
              : []}
          </Round>
          <BracketConnectors
            incoming={1}
            flow="right"
            arms={[afc.champion?.accent]}
          />

          <div className="flex items-center px-1">
            <div className="w-full">
              <SuperBowlCard
                match={bracket.superBowl}
                seasonYear={snapshot.season.year}
                onPick={onPick}
              />
            </div>
          </div>

          <BracketConnectors
            incoming={1}
            flow="left"
            arms={[nfc.champion?.accent]}
          />
          <Round>
            {nfc.championship
              ? [
                  <BracketMatchCard
                    key="cf"
                    match={nfc.championship}
                    onPick={onPick}
                    onOpenGame={onOpenGame}
                    morphCardId={morphCardId}
                    mirrored
                    size="lg"
                  />,
                ]
              : []}
          </Round>
          <BracketConnectors
            incoming={2}
            flow="left"
            arms={divisionalArms(nfc)}
          />
          <Round>
            {nfc.divisional.map((m) => (
              <BracketMatchCard
                key={m.id}
                match={m}
                onPick={onPick}
                onOpenGame={onOpenGame}
                morphCardId={morphCardId}
                mirrored
              />
            ))}
          </Round>
          <BracketConnectors
            incoming={4}
            flow="left"
            arms={wildCardArms(nfc)}
          />
          <Round>
            {[
              <ByeCard key="bye" team={nfc.bye} mirrored />,
              ...nfc.wildcard.map((m) => (
                <BracketMatchCard
                  key={m.id}
                  match={m}
                  onPick={onPick}
                  onOpenGame={onOpenGame}
                  morphCardId={morphCardId}
                  mirrored
                />
              )),
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
