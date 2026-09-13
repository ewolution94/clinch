import express from "express";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";
import { SnapshotStore } from "./snapshotStore.js";

const here = dirname(fileURLToPath(import.meta.url));
const clientDist = join(here, "..", "..", "client", "dist");

const store = new SnapshotStore();
store.start();

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

  req.on("close", () => {
    clearInterval(heartbeat);
    unsubscribe();
    res.end();
  });
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
  console.warn(`[pylon] no client build at ${clientDist} — API only`);
}

const server = app.listen(config.port, () => {
  console.log(`[pylon] listening on :${config.port}`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    store.stop();
    server.close(() => process.exit(0));
  });
}
