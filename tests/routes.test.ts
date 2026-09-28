/**
 * What a URL means.
 *
 * These are the only lines in the app that decide what a shared link opens, and
 * every one of them is a promise made to someone who wasn't there when it was
 * sent. A link that quietly lands on the wrong view is worse than one that
 * fails, because nobody notices.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { PATHS, parseRoute, parseTeam, parseWeekSlug } from "../client/src/lib/routes.js";

describe("which view a path is", () => {
  it("maps each view's own path back to it", () => {
    for (const [route, path] of Object.entries(PATHS)) {
      assert.equal(parseRoute(path), route, `${path} should be ${route}`);
    }
  });

  it("keeps the view when the path carries a segment", () => {
    assert.equal(parseRoute("/week/14"), "week");
    assert.equal(parseRoute("/week/super-bowl"), "week");
    assert.equal(parseRoute("/team/KC"), "team");
  });

  it("lands an unknown path on the standings rather than on nothing", () => {
    // An old link, a typo, or a path a future build stops serving. Somewhere
    // real beats a blank page.
    assert.equal(parseRoute("/nonsense"), "standings");
    assert.equal(parseRoute("/"), "standings");
    assert.equal(parseRoute(""), "standings");
  });
});

describe("the team in a path", () => {
  it("reads the abbreviation", () => {
    assert.equal(parseTeam("/team/KC"), "KC");
    assert.equal(parseTeam("/team/WSH"), "WSH");
  });

  it("upper-cases it, because a hand-typed link won't", () => {
    assert.equal(parseTeam("/team/kc"), "KC");
    assert.equal(parseTeam("/team/Sea"), "SEA");
  });

  it("reads nothing from a bare /team", () => {
    // Which is the point of the bare path: "my team", not a named one.
    assert.equal(parseTeam("/team"), null);
    assert.equal(parseTeam("/team/"), null);
  });

  it("ignores anything that is not an abbreviation", () => {
    assert.equal(parseTeam("/team/12"), null);
    assert.equal(parseTeam("/team/kansas-city"), null);
    assert.equal(parseTeam("/team/K"), null);
    assert.equal(parseTeam("/team/ABCDE"), null);
  });

  it("stops at the segment, not at the rest of the URL", () => {
    assert.equal(parseTeam("/team/KC/anything"), "KC");
    assert.equal(parseTeam("/team/KC?season=2023"), "KC");
    assert.equal(parseTeam("/team/KC#top"), "KC");
  });

  it("reads no team out of another view's path", () => {
    assert.equal(parseTeam("/week/14"), null);
    assert.equal(parseTeam("/teams/KC"), null);
  });
});

describe("the week in a path", () => {
  it("reads the slug", () => {
    assert.equal(parseWeekSlug("/week/14"), "14");
    assert.equal(parseWeekSlug("/week/super-bowl"), "super-bowl");
  });

  it("decodes it, since it was encoded on the way in", () => {
    assert.equal(parseWeekSlug("/week/wild%20card"), "wild card");
  });

  it("reads nothing from a bare /week or another view", () => {
    assert.equal(parseWeekSlug("/week"), null);
    assert.equal(parseWeekSlug("/team/KC"), null);
  });
});
