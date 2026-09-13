import { PylonMark } from "./PylonMark";

export function Skeleton({ connection }: { connection: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 px-6 text-center">
      <PylonMark size={54} className="animate-sheen" />
      <div className="flex flex-col gap-2">
        <p className="font-display text-[15px] text-fog">
          {connection === "offline" ? "Can't reach the server" : "Pulling the league in…"}
        </p>
        <p className="font-mono text-[11px] tracking-[0.12em] text-mist">
          {connection === "offline" ? "RETRYING" : "STANDINGS · SEEDS · SCHEDULE"}
        </p>
      </div>
    </div>
  );
}
