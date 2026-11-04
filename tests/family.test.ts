/**
 * Dashboard's family defaults.
 *
 * What Clinch hands Dashboard (client/public/ewo.config.json), checked with
 * Folio's own rules, and the order a setting is decided in: this device's own
 * pick, then Dashboard's value, then the built-in one — dark, English and the
 * device's motion, which is also all there is with Dashboard off or down
 * (client/src/lib/defaults.ts, and the pre-paint script in index.html).
 */
import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { checkManifest, resolve } from "../client/vendor/ewo/elements/config-core.js";
import { langFor, motionFor, shownFor, themeFor } from "../client/src/lib/defaults.js";
import { DEFAULT_SETTINGS, loadSettings } from "../client/src/lib/settings.js";

const manifest = JSON.parse(readFileSync(new URL("../client/public/ewo.config.json", import.meta.url), "utf8"));

describe("the manifest", () => {
  it("is one Dashboard takes: the family's language, theme and motion", () => {
    const { ok, problems, manifest: checked } = checkManifest(manifest);
    assert.deepEqual(problems, []);
    assert.ok(ok);
    assert.equal(checked.app, "clinch");
    assert.deepEqual(Object.keys(checked.settings), ["lang", "theme", "motion"]);
  });

  it("with nothing set in Dashboard, gives today's Clinch: English, dark, the device's motion", () => {
    const { values, sources } = resolve(manifest, {});
    assert.deepEqual(values, { lang: "en", theme: "dark", motion: "system" });
    assert.deepEqual(sources, { lang: "own", theme: "own", motion: "built-in" });
    assert.deepEqual(shownFor(DEFAULT_SETTINGS, values), { theme: "dark", lang: "en", motion: "system" });
    // No values in the page at all (the dev server, Dashboard off): the same.
    assert.deepEqual(shownFor(DEFAULT_SETTINGS, {}), { theme: "dark", lang: "en", motion: "system" });
  });

  it("lets a value set for Clinch reach the page, and the family's motion", () => {
    const set = resolve(manifest, { app: { theme: "light", lang: "de" }, family: { motion: "less" } }).values;
    assert.deepEqual(set, { lang: "de", theme: "light", motion: "less" });
    assert.deepEqual(shownFor(DEFAULT_SETTINGS, set), { theme: "light", lang: "de", motion: "reduced" });
  });

  it("keeps Clinch's own dark and English over the family's theme and language", () => {
    // Clinch's own default comes before the family's (Folio's resolve order), so
    // today's look stays unless a value is set for Clinch itself.
    const values = resolve(manifest, { family: { theme: "light", lang: "de", motion: "full" } }).values;
    assert.deepEqual(values, { lang: "en", theme: "dark", motion: "full" });
  });
});

describe("the order a setting is decided in", () => {
  it("puts this device's pick first, then Dashboard's, then the built-in one", () => {
    assert.equal(themeFor("creative", "light"), "creative");
    assert.equal(themeFor("dark", "light"), "dark");
    assert.equal(themeFor("default", "light"), "light");
    assert.equal(themeFor("default", "dark"), "dark");
    assert.equal(themeFor("default", "system"), "dark", "Dashboard's System is no default");
    assert.equal(themeFor("default", undefined), "dark");

    assert.equal(langFor("en", "de"), "en");
    assert.equal(langFor("default", "de"), "de");
    assert.equal(langFor("default", "system"), "en");
    assert.equal(langFor("default", 42), "en");

    assert.equal(motionFor("full", "less"), "full");
    assert.equal(motionFor("reduced", "full"), "reduced");
    assert.equal(motionFor("system", "less"), "reduced");
    assert.equal(motionFor("system", "full"), "full");
    assert.equal(motionFor("system", "system"), "system");
  });
});

describe("this device's picks", () => {
  const global = globalThis as Record<string, unknown>;
  const stored = (value: unknown) => {
    global.window = { localStorage: { getItem: () => JSON.stringify(value), setItem() {} } };
  };
  afterEach(() => {
    delete global.window;
  });

  it("start as Default for the theme and language, so Dashboard's can reach them", () => {
    stored({ favourite: "BUF" });
    const loaded = loadSettings();
    assert.equal(loaded.theme, "default");
    assert.equal(loaded.lang, "default");
    assert.equal(loaded.motion, "system");
  });

  it("include the dark and English saved before Dashboard, which keep winning", () => {
    // Saved with every field: it can't tell a pick from the old default, so it
    // stays what it was.
    stored({ ...DEFAULT_SETTINGS, theme: "dark", lang: "en" });
    assert.deepEqual(shownFor(loadSettings(), { theme: "light", lang: "de", motion: "less" }), {
      theme: "dark",
      lang: "en",
      motion: "reduced",
    });
  });
});

/** The pre-paint script in client/index.html against a stub page. */
function boot({ saved, config, blocked }: { saved?: unknown; config?: unknown; blocked?: boolean }) {
  const html = readFileSync(new URL("../client/index.html", import.meta.url), "utf8");
  const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).find((s) => s.includes("clinch-settings-v1"));
  assert.ok(script, "the pre-paint script is in index.html");
  const root = { dataset: {} as Record<string, string>, lang: "en", style: { colorScheme: "" } };
  const meta = { content: "#05070c", setAttribute(_: string, value: string) { meta.content = value; } };
  const document = {
    documentElement: root,
    getElementById: (id: string) => (id === "ewo-config" && config !== undefined ? { textContent: JSON.stringify(config) } : null),
    querySelector: () => meta,
  };
  const localStorage = {
    getItem: (key: string) => {
      if (blocked) throw new Error("SecurityError");
      return key === "clinch-settings-v1" && saved !== undefined ? JSON.stringify(saved) : null;
    },
  };
  vm.runInNewContext(script, { document, localStorage });
  return { theme: root.dataset.theme, motion: root.dataset.motion, lang: root.lang, color: meta.content };
}

describe("before first paint", () => {
  it("is today's page with nothing set: dark, English, no motion override", () => {
    const today = { theme: "dark", motion: undefined, lang: "en", color: "#05070c" };
    assert.deepEqual(boot({}), today);
    assert.deepEqual(boot({ config: resolve(manifest, {}).values }), today);
    assert.deepEqual(boot({ config: "not an object" }), today);
  });

  it("takes Dashboard's values on a device that hasn't picked", () => {
    assert.deepEqual(boot({ config: { theme: "light", lang: "de", motion: "less" } }), {
      theme: "light",
      motion: "reduced",
      lang: "de",
      color: "#eef2f9",
    });
    assert.deepEqual(boot({ saved: { theme: "default", lang: "default", motion: "system" }, config: { theme: "light", motion: "full" } }), {
      theme: "light",
      motion: "full",
      lang: "en",
      color: "#eef2f9",
    });
    // Storage blocked: nothing picked, so Dashboard's still apply.
    assert.equal(boot({ blocked: true, config: { theme: "light" } }).theme, "light");
  });

  it("lets this device's picks win", () => {
    assert.deepEqual(boot({ saved: { theme: "creative", lang: "en", motion: "full" }, config: { theme: "light", lang: "de", motion: "less" } }), {
      theme: "creative",
      motion: "full",
      lang: "en",
      color: "#05070c",
    });
    assert.equal(boot({ saved: { theme: "dark" }, config: { theme: "light" } }).theme, "dark");
  });
});
