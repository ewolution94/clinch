/**
 * Reader preferences.
 *
 * The guard being protected here is `normalize()` merging field by field onto
 * the defaults rather than trusting whatever was parsed. A value corrupted by
 * hand, or written by a future build with renamed fields, then costs that one
 * setting instead of all of them.
 */
import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from "../client/src/lib/settings.js";

const KEY = "clinch-settings-v1";
const global = globalThis as Record<string, unknown>;

/** Just enough of a browser for the settings module: one storage slot. */
function withStorage(initial?: string, broken?: "read" | "write") {
  const store = new Map<string, string>();
  if (initial !== undefined) store.set(KEY, initial);

  global.window = {
    localStorage: {
      getItem(key: string) {
        if (broken === "read") throw new Error("SecurityError: storage is blocked");
        return store.get(key) ?? null;
      },
      setItem(key: string, value: string) {
        if (broken === "write") throw new Error("QuotaExceededError");
        store.set(key, value);
      },
    },
  };
  return store;
}

afterEach(() => {
  delete global.window;
});

describe("loading preferences", () => {
  it("gives the defaults when nothing has been stored", () => {
    withStorage();
    assert.deepEqual(loadSettings(), DEFAULT_SETTINGS);
  });

  it("reads back what was saved", () => {
    withStorage();
    const mine = { ...DEFAULT_SETTINGS, theme: "creative" as const, lang: "de" as const, favourite: "BUF" };
    saveSettings(mine);
    const loaded = loadSettings();

    for (const field of ["theme", "lang", "landing", "conference", "motion", "favourite", "tvOnly"] as const) {
      assert.deepEqual(loaded[field], mine[field], field);
    }
  });

  it("turns an unset lastRoute into standings on the way back in", () => {
    // Not what you'd expect from the round trip, and harmless: JSON keeps the
    // null, `normalize` only counts `undefined` as unset, so a stored null
    // becomes "standings". Both mean the same thing to the only reader of this
    // field — landing "last" with nothing remembered opens the standings — so
    // this records the behaviour rather than asserting the tidier version.
    withStorage();
    saveSettings({ ...DEFAULT_SETTINGS, lastRoute: null });

    assert.equal(loadSettings().lastRoute, "standings");
    assert.equal(DEFAULT_SETTINGS.lastRoute, null, "though the default really is unset");
  });

  it("keeps the good fields of a half-corrupt value and defaults only the bad", () => {
    withStorage(JSON.stringify({ theme: 42, lang: "de", landing: "nonsense", motion: "reduced" }));
    const loaded = loadSettings();

    assert.equal(loaded.lang, "de", "the German survives");
    assert.equal(loaded.motion, "reduced", "so does the reduced motion");
    assert.equal(loaded.theme, DEFAULT_SETTINGS.theme, "only the nonsense is dropped");
    assert.equal(loaded.landing, DEFAULT_SETTINGS.landing);
  });

  it("survives a value that is not an object, or not JSON at all", () => {
    withStorage("not json at all{");
    assert.deepEqual(loadSettings(), DEFAULT_SETTINGS);

    withStorage(JSON.stringify("a string"));
    assert.deepEqual(loadSettings(), DEFAULT_SETTINGS);

    withStorage(JSON.stringify(null));
    assert.deepEqual(loadSettings(), DEFAULT_SETTINGS);
  });

  it("takes a favourite that is shaped like a team, and no other", () => {
    withStorage(JSON.stringify({ favourite: "BUF" }));
    assert.equal(loadSettings().favourite, "BUF");

    // Shape only — an abbreviation naming no team simply never matches.
    withStorage(JSON.stringify({ favourite: "buffalo" }));
    assert.equal(loadSettings().favourite, null);

    withStorage(JSON.stringify({ favourite: 12 }));
    assert.equal(loadSettings().favourite, null);
  });

  it("treats the TV filter as off unless it is exactly on", () => {
    withStorage(JSON.stringify({ tvOnly: "yes" }));
    assert.equal(loadSettings().tvOnly, false);

    withStorage(JSON.stringify({ tvOnly: true }));
    assert.equal(loadSettings().tvOnly, true);
  });

  it("renders perfectly well when storage is blocked entirely", () => {
    // Private mode, a wiped profile, a half-written value: all of these mean
    // "no preferences", which is a fine state to open the page in.
    withStorage(undefined, "read");
    assert.deepEqual(loadSettings(), DEFAULT_SETTINGS);
  });

  it("does not throw when the write fails", () => {
    withStorage(undefined, "write");
    assert.doesNotThrow(() => saveSettings(DEFAULT_SETTINGS));
  });

  it("gives the defaults with no browser at all", () => {
    // Nothing here runs on a server today, but the module says it survives it.
    assert.deepEqual(loadSettings(), DEFAULT_SETTINGS);
  });
});
