/**
 * Yard lines and hash marks at the edge of visibility — enough to read as a
 * field under raking floodlight, not enough to compete with the data on top.
 */
export function FieldBackdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-abyss">
      <div
        className="absolute inset-0 opacity-[0.55]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, var(--color-line-soft) 0 1px, transparent 1px 96px)",
        }}
      />
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, transparent 0 46px, var(--color-line-soft) 46px 47px, transparent 47px 96px)",
          maskImage: "repeating-linear-gradient(180deg, #000 0 6px, transparent 6px 34px)",
          WebkitMaskImage: "repeating-linear-gradient(180deg, #000 0 6px, transparent 6px 34px)",
        }}
      />

      <div className="animate-sheen absolute -top-48 left-1/2 h-[620px] w-[900px] -translate-x-1/2 rounded-full bg-brand/10 blur-[150px]" />
      <div
        className="animate-sheen absolute -bottom-64 -left-40 h-[520px] w-[520px] rounded-full bg-jade/[0.07] blur-[150px]"
        style={{ animationDelay: "-4.5s" }}
      />

      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse 90% 55% at 50% 0%, transparent 0%, var(--color-abyss) 80%)" }}
      />
    </div>
  );
}
