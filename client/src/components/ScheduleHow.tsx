import { useState } from "react";
import { useStrings } from "../lib/useSettings";

/**
 * Why a team plays the teams it plays.
 *
 * Built to the same shape as `Legend` — the expandable info block the standings
 * and the playoff picture already end with — because a reader shouldn't have to
 * learn a second control to read a second explanation. Same section, same
 * button, same `+` that turns into a cross, same grid of titled paragraphs.
 * Change one of these and change the other.
 *
 * The content is the league's own published formula, not a reading of this
 * season's fixtures: nothing in it is derived from the data, so it cannot drift
 * when the data does. It **deliberately says nothing about how bye weeks are
 * placed** — the NFL's own page states no rule, and the pattern of recent
 * seasons is an observation rather than one.
 */
export function ScheduleHow() {
  const t = useStrings();
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-2xl border border-line bg-ink/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="font-mono text-[13px] tracking-[0.18em] text-mist">
          {t.scheduleHowTitle}
        </span>
        <span
          className="font-mono text-[15.5px] text-mist transition-transform"
          style={{ transform: open ? "rotate(45deg)" : "none" }}
        >
          +
        </span>
      </button>
      <div className="drawer" data-open={open}>
        <div>
          <div className="flex flex-col gap-3 px-4 pb-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {t.scheduleHowRules.map((rule) => (
                <div key={rule.title} className="flex flex-col gap-1.5">
                  <h4 className="font-display text-[15.5px] font-semibold text-paper">
                    {rule.title}
                  </h4>
                  <p className="font-display text-[14.5px] leading-relaxed text-mist">
                    {rule.body}
                  </p>
                </div>
              ))}
            </div>
            <p className="font-mono text-[11.5px] tracking-[0.06em] text-mist/70">
              {t.scheduleHowSource}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
