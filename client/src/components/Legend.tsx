import { useState } from "react";

const RULES: { title: string; body: string }[] = [
  {
    title: "Seven per conference",
    body: "The four division winners take seeds 1–4, ranked by record. The three best records left over are the wild cards, seeds 5–7.",
  },
  {
    title: "Winning your division beats a better record",
    body: "A 9-8 division winner is seeded above a 12-5 wild card. That's why the standings and the seed order disagree so often.",
  },
  {
    title: "Only the 1 seed rests",
    body: "Seed 1 skips the wild card round and hosts every game it plays. Seeds 2–7 start the playoffs immediately: 2v7, 3v6, 4v5.",
  },
  {
    title: "What the labels mean",
    body: "Clinched and eliminated are only shown once the maths is settled — a clinched team cannot drop out even if it loses every remaining game, and an eliminated team cannot catch the 7 seed even if it wins them all.",
  },
];

export function Legend() {
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-2xl border border-line bg-ink/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="font-mono text-[11.5px] tracking-[0.18em] text-mist">
          HOW THE NFL PLAYOFF FIELD WORKS
        </span>
        <span
          className="font-mono text-[14px] text-mist transition-transform"
          style={{ transform: open ? "rotate(45deg)" : "none" }}
        >
          +
        </span>
      </button>
      <div className="drawer" data-open={open}>
        <div>
          <div className="grid gap-4 px-4 pb-4 sm:grid-cols-2 lg:grid-cols-4">
            {RULES.map((rule) => (
              <div key={rule.title} className="flex flex-col gap-1.5">
                <h4 className="font-display text-[14px] font-semibold text-paper">
                  {rule.title}
                </h4>
                <p className="font-display text-[13px] leading-relaxed text-mist">
                  {rule.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
