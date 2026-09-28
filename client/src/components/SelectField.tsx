import { clsx } from "clsx";
import type { SelectHTMLAttributes } from "react";

/**
 * The app's one dropdown.
 *
 * A real `<select>` — the native control, the native sheet on a phone, the
 * native keyboard behaviour — but with its own chevron rather than the
 * browser's.
 *
 * The reason is mundane and was measured rather than assumed: a native arrow
 * ignores `padding-right`. Setting it to 40px in Chromium moved the text and
 * left the arrow exactly where it was, hard against the border, which is what
 * Eric was looking at. Every engine paints and places that arrow differently,
 * so the only way to give it room on iOS as well as here is to stop using it:
 * `appearance: none`, and draw one that sits where we put it.
 *
 * It follows `currentColor`, so it themes itself along with everything else —
 * which a `background-image` data URI could not do.
 *
 * There is one of these on purpose. The favourite-team picker in settings and
 * the team picker in the schedule are supposed to be the same control, and
 * two copies of "a select with a chevron" is how that stops being true.
 */
export function SelectField({
  className,
  wrapperClassName,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { wrapperClassName?: string }) {
  return (
    <span className={clsx("relative block", wrapperClassName)}>
      <select
        {...props}
        className={clsx(
          // `pr-9` is the room the chevron needs; `right-3` is where it sits.
          // They are a pair — the text must never run underneath it.
          "w-full appearance-none rounded-lg border border-line bg-abyss-2/70 py-2.5 pr-9 pl-3 font-mono text-[12.5px] text-paper",
          className,
        )}
      >
        {children}
      </select>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-mist"
      >
        <svg
          width="11"
          height="7"
          viewBox="0 0 11 7"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M1 1 5.5 5.5 10 1" />
        </svg>
      </span>
    </span>
  );
}
