/**
 * The poll loop keeps going round, whatever upstream does.
 *
 * On 2026-10-09 one poll never settled: no answer, no error, no timeout. The
 * loop waited on it for two days, so the page showed Friday's table through a
 * Sunday of games, and the refresh button, which joins a poll already running,
 * did nothing. Every test here stubs a `fetch` that never answers and ignores
 * its abort signal, which is that afternoon in its simplest form.
 */
import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { getJson } from "../server/src/espn.js";

const originalFetch = globalThis.fetch;
let restore: (() => void) | null = null;
afterEach(() => {
  restore?.();
  restore = null;
  globalThis.fetch = originalFetch;
});

/** A `fetch` that never answers, and counts how often it was asked. */
function hangingFetch(): { calls: () => number } {
  let calls = 0;
  globalThis.fetch = (() => {
    calls += 1;
    return new Promise<Response>(() => {});
  }) as typeof fetch;
  return { calls: () => calls };
}

/** Waits for `promise` to settle, either way, and fails the test past `ms`. */
async function within<T>(ms: number, promise: Promise<T>): Promise<void> {
  let timer: NodeJS.Timeout | undefined;
  await Promise.race([
    promise.catch(() => undefined),
    new Promise((_resolve, reject) => {
      timer = setTimeout(() => reject(new Error(`still pending after ${ms}ms`)), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}

/**
 * A store with empty caches and these deadlines. `config` comes through
 * `import()` too: the test file is compiled to CommonJS, and a static import
 * would hand it a different copy from the one the store reads.
 */
let instance = 0;
async function freshStore(deadlines: { requestTimeoutMs: number; pollDeadlineMs?: number }) {
  instance += 1;
  const { config } = await import("../server/src/config.js");
  const before = { ...config };
  Object.assign(config, deadlines);
  const mod = await import(`../server/src/snapshotStore.js?case=${instance}`);
  const store = new mod.SnapshotStore() as {
    refreshNow: () => Promise<unknown>;
    stop: () => void;
    polling: boolean;
  };
  restore = () => {
    store.stop();
    Object.assign(config, before);
  };
  return store;
}

describe("a request upstream never answers", () => {
  it("fails at its deadline even when fetch ignores the abort", async () => {
    hangingFetch();
    await assert.rejects(getJson("https://example.test/scoreboard", 50), /no answer within 50ms/);
  });

  it("fails at its deadline when the headers arrive and the body never does", async () => {
    globalThis.fetch = (async () =>
      ({ ok: true, json: () => new Promise(() => {}) }) as unknown as Response) as typeof fetch;
    await assert.rejects(getJson("https://example.test/scoreboard", 50), /no answer within 50ms/);
  });
});

describe("the poll loop", () => {
  it("lets go of a request that never answers, so the refresh button asks again", async () => {
    const upstream = hangingFetch();
    const store = await freshStore({ requestTimeoutMs: 50 });

    await within(1_000, store.refreshNow());
    assert.equal(upstream.calls(), 1);

    // Before the fix this resolved at once with the old table and asked nobody.
    await within(1_000, store.refreshNow());
    assert.equal(upstream.calls(), 2);
    assert.equal(store.polling, true);
  });

  it("gives up on a whole poll at its own deadline, whatever is holding it", async () => {
    hangingFetch();
    // The request deadline is out of reach here, so only the poll's can end it.
    const store = await freshStore({ requestTimeoutMs: 2_000, pollDeadlineMs: 50 });

    await within(500, store.refreshNow());
    assert.equal(store.polling, true);
  });

  it("says so when no poll has finished for longer than a working loop allows", async (t) => {
    const store = await freshStore({ requestTimeoutMs: 50 });
    t.mock.timers.enable({ apis: ["Date"], now: Date.now() });
    assert.equal(store.polling, true);

    // Defaults: a five-minute poll deadline after a two-minute wait, plus a minute.
    t.mock.timers.tick(9 * 60_000);
    assert.equal(store.polling, false);
  });

  it("joins the poll in flight rather than starting another", async () => {
    const upstream = hangingFetch();
    const store = await freshStore({ requestTimeoutMs: 50 });

    await within(1_000, Promise.all([store.refreshNow(), store.refreshNow(), store.refreshNow()]));
    assert.equal(upstream.calls(), 1);
  });
});
