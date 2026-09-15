import { Shimmer } from "./Shimmer";

/** Mirrors a division card: banner, then four rows. */
function DivisionSkeleton({ delay }: { delay: number }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-ink/40">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <Shimmer className="h-3.5 w-28 rounded" delay={delay} />
        <Shimmer className="h-5 w-20 rounded-md" delay={delay + 60} />
      </div>
      <div className="h-[2px] w-full bg-line-soft" />
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex items-center gap-3 border-t border-line-soft px-4 py-3"
        >
          <Shimmer className="h-5 w-5 rounded-md" delay={delay + i * 70} />
          <Shimmer
            className="h-[30px] w-[30px] rounded-full"
            delay={delay + i * 70 + 20}
          />
          <Shimmer
            className="h-3.5 flex-1 rounded"
            delay={delay + i * 70 + 40}
          />
          <Shimmer className="h-4 w-12 rounded" delay={delay + i * 70 + 60} />
        </div>
      ))}
    </div>
  );
}

/**
 * The standings page with its data not yet in. Shaped like the real thing so
 * the layout doesn't jump when the snapshot lands — the page is already the
 * right size, it just fills in.
 */
export function Skeleton({ connection }: { connection: string }) {
  if (connection === "offline") {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="font-display text-[16.5px] text-fog">
          Can&apos;t reach the server
        </p>
        <p className="font-mono text-[14px] tracking-[0.12em] text-mist">
          RETRYING
        </p>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col gap-6"
      aria-busy="true"
      aria-label="Loading the league"
    >
      <section className="rounded-2xl border border-line bg-ink/40 p-4 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:gap-8">
          <div className="flex shrink-0 flex-col gap-3">
            <Shimmer className="h-[44px] w-56 rounded-lg sm:h-[64px]" />
            <Shimmer
              className="h-[3px] w-full rounded-full lg:w-[260px]"
              delay={120}
            />
          </div>
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:gap-3">
            <Shimmer className="h-[76px] flex-1 rounded-xl" delay={180} />
            <Shimmer className="h-[76px] flex-1 rounded-xl" delay={260} />
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <Shimmer className="h-3 w-24 rounded" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-[repeat(auto-fill,minmax(150px,1fr))]">
          {Array.from({ length: 8 }, (_, i) => (
            <Shimmer key={i} className="h-[92px] rounded-xl" delay={i * 60} />
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-2 xl:gap-6">
        {[0, 1].map((conference) => (
          <section key={conference} className="flex flex-col gap-4">
            <Shimmer
              className="h-[52px] w-40 rounded-lg"
              delay={conference * 100}
            />
            <div className="grid grid-cols-1 gap-3">
              {[0, 1, 2, 3].map((i) => (
                <DivisionSkeleton key={i} delay={conference * 100 + i * 90} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
