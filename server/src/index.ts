import express from "express";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";
import { describeError } from "./describeError.js";
import { gameCalendar } from "./calendar.js";
import { SnapshotStore } from "./snapshotStore.js";
import { GameDetailStore } from "./gameDetailStore.js";

const here = dirname(fileURLToPath(import.meta.url));
const clientDist = join(here, "..", "..", "client", "dist");

const store = new SnapshotStore();
store.start();

const games = new GameDetailStore();

const app = express();
app.disable("x-powered-by");

app.get("/api/health", (_req, res) => {
  const snapshot = store.current;
  res.json({
    ok: true,
    ready: snapshot !== null,
    stale: snapshot?.stale ?? null,
    updatedAt: snapshot?.generatedAt ?? null,
  });
});

app.get("/api/snapshot", (_req, res) => {
  const snapshot = store.current;
  if (!snapshot) {
    res.status(503).json({ error: "warming up" });
    return;
  }
  res.json(snapshot);
});

app.get("/api/week/:seasonType/:week", async (req, res) => {
  const seasonType = Number.parseInt(req.params.seasonType, 10);
  const week = Number.parseInt(req.params.week, 10);
  // Both land in an upstream URL, so both are checked rather than trusted.
  if ((seasonType !== 2 && seasonType !== 3) || !Number.isFinite(week) || week < 1 || week > 25) {
    res.status(400).json({ error: "bad week" });
    return;
  }

  try {
    res.setHeader("cache-control", "no-store");
    res.json(await store.week(seasonType, week));
  } catch (error) {
    console.error("[clinch] week failed:", describeError(error));
    res.status(502).json({ error: "upstream unavailable" });
  }
});

app.get("/api/game/:id", async (req, res) => {
  const { id } = req.params;
  // The id lands in an upstream URL, so it is checked rather than trusted.
  if (!/^\d{6,12}$/.test(id)) {
    res.status(400).json({ error: "bad game id" });
    return;
  }

  try {
    res.setHeader("cache-control", "no-store");
    res.json(await games.get(id));
  } catch (error) {
    console.error("[clinch] game detail failed:", describeError(error));
    res.status(502).json({ error: "upstream unavailable" });
  }
});

app.get("/api/game/:id/calendar.ics", async (req, res) => {
  const { id } = req.params;
  if (!/^\d{6,12}$/.test(id)) {
    res.status(400).json({ error: "bad game id" });
    return;
  }
  const lang = req.query.lang === "de" ? "de" : "en";

  try {
    const detail = await games.get(id);
    // The channel lives on the week's scoreboard, not in the game summary. If
    // that lookup fails the entry is still worth having, just without it.
    const week =
      (detail.seasonType === 2 || detail.seasonType === 3) && detail.week >= 1 && detail.week <= 25
        ? await store.week(detail.seasonType, detail.week).catch(() => null)
        : null;
    const game = week?.games.find((g) => g.id === id);
    const origin = `${req.get("x-forwarded-proto") ?? req.protocol}://${req.get("host")}`;
    const { filename, body } = gameCalendar({ detail, game, lang, origin });

    res.setHeader("content-type", "text/calendar; charset=utf-8");
    // Inline, not attachment: iOS Safari shows its "Add to Calendar" sheet for
    // an inline calendar and just downloads an attachment.
    res.setHeader("content-disposition", `inline; filename="${filename}"`);
    res.setHeader("cache-control", "no-store");
    res.send(body);
  } catch (error) {
    console.error("[clinch] calendar failed:", describeError(error));
    res.status(502).json({ error: "upstream unavailable" });
  }
});

/**
 * Open event streams. An SSE response is a connection that by design never
 * finishes, so `server.close()` — which waits for connections to end — would
 * wait on them forever. Shutdown has to end them itself.
 */
const streams = new Set<() => void>();

app.get("/api/stream", (req, res) => {
  res.writeHead(200, {
    "content-type": "text/event-stream",
    "cache-control": "no-cache, no-transform",
    connection: "keep-alive",
    // Cloudflare and nginx both buffer SSE without this.
    "x-accel-buffering": "no",
  });

  const send = (snapshot: unknown) => res.write(`data: ${JSON.stringify(snapshot)}\n\n`);
  if (store.current) send(store.current);

  const unsubscribe = store.subscribe(send);
  const heartbeat = setInterval(() => res.write(": ping\n\n"), 25_000);

  const close = () => {
    clearInterval(heartbeat);
    unsubscribe();
    streams.delete(close);
    res.end();
  };

  streams.add(close);
  req.on("close", close);
});

if (existsSync(clientDist)) {
  app.use(
    express.static(clientDist, {
      setHeaders(res, path) {
        // Vite fingerprints everything under /assets; logos are content-stable.
        if (path.includes("/assets/") || path.includes("/logos/")) {
          res.setHeader("cache-control", "public, max-age=31536000, immutable");
        }
      },
    })
  );
  app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(join(clientDist, "index.html")));
} else {
  console.warn(`[clinch] no client build at ${clientDist} — API only`);
}

const server = app.listen(config.port, () => {
  console.log(`[clinch] listening on :${config.port}`);
});

/**
 * Shutdown used to hang whenever anyone had the page open.
 *
 * `server.close()` stops accepting new connections and then waits for the
 * existing ones to end — but an SSE stream never ends, so with a single browser
 * tab connected the callback never ran and the process sat there. Pressing
 * Ctrl+C again didn't help: each press called `server.close(cb)` again, and each
 * call registers another one-shot `close` listener, which is where
 * "MaxListenersExceededWarning: 11 close listeners added to [Server]" came from.
 * The warning was the symptom; the open stream was the cause.
 *
 * In a container it showed up as every restart taking the full ten seconds
 * before Docker gave up on SIGTERM and sent SIGKILL.
 */
let shuttingDown = false;

function shutdown(signal: string): void {
  if (shuttingDown) {
    // A second signal means the reader is no longer asking politely — and
    // returning here is what stops the listeners from stacking up.
    console.warn(`[clinch] ${signal} again — exiting now`);
    process.exit(1);
  }
  shuttingDown = true;
  console.log(`[clinch] ${signal} — shutting down`);

  store.stop();
  for (const close of [...streams]) close();

  server.close(() => process.exit(0));
  // Keep-alive sockets with nothing in flight would otherwise hold the door.
  server.closeIdleConnections();

  // Nothing here is worth waiting on: no writes, no disk, no state. If the
  // drain hasn't finished shortly, drop what's left and go. Unref'd so a clean
  // shutdown still exits immediately rather than sitting out the grace period.
  setTimeout(() => {
    console.warn("[clinch] drain timed out — forcing exit");
    server.closeAllConnections();
    process.exit(0);
  }, 3_000).unref();
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => shutdown(signal));
}
