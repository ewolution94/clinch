import { clsx } from "clsx";

interface ShimmerProps {
  className?: string;
  /** Staggers the sweep so a column of rows fills in rather than flashing. */
  delay?: number;
}

export function Shimmer({ className, delay = 0 }: ShimmerProps) {
  return (
    <span
      aria-hidden="true"
      className={clsx("shimmer block", className)}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
    />
  );
}
