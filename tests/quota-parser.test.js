const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  parseLiveRateLimits,
  parseLogLine
} = require("../dist/main/main/quota-parser.js");

describe("parseLiveRateLimits", () => {
  it("maps five-hour and weekly windows by duration", () => {
    const snapshot = parseLiveRateLimits(
      {
        rateLimits: {
          limitId: "codex",
          primary: {
            usedPercent: 8,
            windowDurationMins: 300,
            resetsAt: 1_783_079_180
          },
          secondary: {
            usedPercent: 37,
            windowDurationMins: 10_080,
            resetsAt: 1_783_401_733
          },
          planType: "plus"
        }
      },
      "2026-07-03T08:00:00.000Z"
    );

    assert.equal(snapshot.fiveHour.remainingPercent, 92);
    assert.equal(snapshot.weekly.remainingPercent, 63);
    assert.equal(snapshot.planType, "plus");
    assert.equal(snapshot.source, "live");
  });

  it("falls back to rateLimitsByLimitId", () => {
    const snapshot = parseLiveRateLimits({
      rateLimits: null,
      rateLimitsByLimitId: {
        codex: {
          primary: {
            usedPercent: 20,
            windowDurationMins: 300,
            resetsAt: 100
          },
          secondary: null
        }
      }
    });

    assert.equal(snapshot.fiveHour.usedPercent, 20);
    assert.equal(snapshot.weekly, null);
  });

  it("clamps percentages", () => {
    const snapshot = parseLiveRateLimits({
      rateLimits: {
        primary: {
          usedPercent: 110,
          windowDurationMins: 300,
          resetsAt: 100
        }
      }
    });

    assert.equal(snapshot.fiveHour.usedPercent, 100);
    assert.equal(snapshot.fiveHour.remainingPercent, 0);
  });
});

describe("parseLogLine", () => {
  it("parses the snake_case session snapshot", () => {
    const line = JSON.stringify({
      timestamp: "2026-07-03T06:46:44.105Z",
      type: "event_msg",
      payload: {
        type: "token_count",
        rate_limits: {
          primary: {
            used_percent: 2,
            window_minutes: 300,
            resets_at: 1_783_079_179
          },
          secondary: {
            used_percent: 36,
            window_minutes: 10_080,
            resets_at: 1_783_401_732
          },
          plan_type: "plus"
        }
      }
    });

    const snapshot = parseLogLine(line);
    assert.equal(snapshot.fiveHour.remainingPercent, 98);
    assert.equal(snapshot.weekly.remainingPercent, 64);
    assert.equal(snapshot.source, "cache");
    assert.match(snapshot.warning, /缓存/);
  });

  it("ignores unrelated or malformed lines", () => {
    assert.equal(parseLogLine("{nope"), null);
    assert.equal(parseLogLine(JSON.stringify({ payload: {} })), null);
  });
});
