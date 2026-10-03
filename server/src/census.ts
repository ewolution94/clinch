/**
 * The forwarder for Census, the self-hosted visit counter (github.com/ewolution94/census).
 * Ported from Cantina's dependency-free server/census.mjs.
 *
 * The browser loads /_e.js and posts page views to /_e on this origin. Both are passed through
 * unchanged to the Census container over the NAS's shared Docker network (`ewolution`), with
 * only the headers Census reads, plus X-Site naming this app. It computes nothing: the hashing
 * and the opt-out and bot rules all live in Census.
 *
 * With no target configured (local runs), it answers with an empty beacon and accepts views
 * without sending them anywhere, so nothing fails in the console and nothing is counted.
 */
import type { IncomingMessage, ServerResponse } from "node:http";

const FORWARDED = ["user-agent", "cf-connecting-ip", "cf-ipcountry", "sec-gpc", "dnt", "content-type", "if-none-match"];
const RETURNED = ["content-type", "cache-control", "etag", "x-content-type-options"];
/** A page view is well under 1 KB; Census refuses more than that anyway. */
const MAX_BODY = 2048;

export interface CensusOptions {
  /** Census's ingest origin, e.g. http://census:4901; empty turns forwarding off. */
  target?: string;
  site: string;
  timeout?: number;
}

/** Resolves true when the request was one of ours and has been answered. */
export function createCensus({ target, site, timeout = 5000 }: CensusOptions) {
  return async function census(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
    const { pathname } = new URL(req.url ?? "/", "http://localhost");
    if (pathname !== "/_e" && pathname !== "/_e.js") return false;

    const script = pathname === "/_e.js";
    if (script ? req.method !== "GET" && req.method !== "HEAD" : req.method !== "POST") {
      res.writeHead(405).end();
      return true;
    }

    let body: Buffer | undefined;
    if (!script) {
      const read = await readBody(req, MAX_BODY);
      if (read === null) {
        res.writeHead(413).end();
        return true;
      }
      body = read;
    }

    if (!target) {
      if (script) res.writeHead(200, { "content-type": "text/javascript; charset=utf-8", "cache-control": "no-cache" }).end();
      else res.writeHead(204).end();
      return true;
    }

    // The visitor's address: Cloudflare's header when it's there; Census falls back to this one
    // for a visit over the LAN. Whatever the client sent as X-Forwarded-For or X-Site is dropped.
    const headers: Record<string, string> = {
      "x-site": site,
      "x-forwarded-for": (req.socket.remoteAddress ?? "").replace(/^::ffff:/, ""),
    };
    for (const name of FORWARDED) {
      const value = req.headers[name];
      if (typeof value === "string") headers[name] = value;
    }

    try {
      const upstream = await fetch(new URL(pathname, target), {
        method: req.method,
        headers,
        body: body && new Uint8Array(body),
        signal: AbortSignal.timeout(timeout),
      });
      const out: Record<string, string> = {};
      for (const name of RETURNED) {
        const value = upstream.headers.get(name);
        if (value) out[name] = value;
      }
      const payload = req.method === "HEAD" ? undefined : Buffer.from(await upstream.arrayBuffer());
      res.writeHead(upstream.status, out).end(payload);
    } catch {
      // Census down, or not on the network yet: the beacon gives up quietly, the page doesn't care.
      if (!res.headersSent) res.writeHead(502).end();
    }
    return true;
  };
}

/** The whole body, or null once it passes `limit` bytes. */
function readBody(req: IncomingMessage, limit: number): Promise<Buffer | null> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > limit) {
        req.removeAllListeners("data");
        req.resume();
        resolve(null);
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}
