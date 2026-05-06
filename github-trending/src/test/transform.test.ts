import { test } from "node:test";
import assert from "node:assert/strict";
import { createTestHarness } from "@world2agent/sdk/testing";
import sensor from "../index.js";
import { transformTrendingDigest } from "../transform.js";
import type { TrendingRepo } from "../types.js";

const FIXTURE: TrendingRepo[] = [
  {
    rank: 1,
    full_name: "vercel/next.js",
    author: "vercel",
    name: "next.js",
    url: "https://github.com/vercel/next.js",
    description: "The React Framework for the Web",
    language: "TypeScript",
    stars_total: 130_000,
    stars_gained_in_window: 850,
    forks: 28_000,
  },
  {
    rank: 2,
    full_name: "rust-lang/rust",
    author: "rust-lang",
    name: "rust",
    url: "https://github.com/rust-lang/rust",
    description: "Empowering everyone to build reliable and efficient software.",
    language: "Rust",
    stars_total: 100_000,
    stars_gained_in_window: 500,
    forks: 13_000,
  },
];

test("transformTrendingDigest produces a schema-valid W2ASignal", () => {
  const signal = transformTrendingDigest({
    window: "weekly",
    capturedAt: Date.UTC(2026, 4, 6),
    repos: FIXTURE,
  });

  const harness = createTestHarness(sensor, {
    config: { cadence: "weekly", top_n: 10, dedupe_within_cycles: 0 },
  });
  assert.equal(harness.isValid(signal), true, "signal must pass W2A schema validation");
});

test("event.summary leads with header + lead repo + per-repo lines", () => {
  const signal = transformTrendingDigest({
    window: "weekly",
    capturedAt: Date.UTC(2026, 4, 6),
    repos: FIXTURE,
  });

  const lines = signal.event.summary.split("\n");
  assert.match(lines[0], /^🔥 GitHub Trending — Weekly Digest .* top 2$/);
  assert.match(lines[1], /^📊 Lead: vercel\/next\.js \+850 ⭐/);
  assert.ok(
    signal.event.summary.includes("[vercel/next.js](https://github.com/vercel/next.js)"),
    "summary must contain a clickable markdown link to the lead repo",
  );
  assert.ok(
    signal.event.summary.includes("🥇") && signal.event.summary.includes("🥈"),
    "summary must use rank emoji for ranks 1–3",
  );
});

test("source_event.data.repos preserves every required field", () => {
  const signal = transformTrendingDigest({
    window: "daily",
    capturedAt: Date.UTC(2026, 4, 6),
    repos: FIXTURE,
  });

  assert.equal(signal.event.type, "repo.trending.refreshed");
  assert.ok(signal.source_event, "source_event must be present");
  const data = signal.source_event.data as {
    window: string;
    repo_count: number;
    repos: TrendingRepo[];
  };
  assert.equal(data.window, "daily");
  assert.equal(data.repo_count, 2);
  for (const r of data.repos) {
    for (const k of [
      "rank",
      "full_name",
      "author",
      "name",
      "url",
      "stars_total",
      "stars_gained_in_window",
      "forks",
    ] as const) {
      assert.ok(r[k] !== undefined, `repo missing required field ${k}`);
    }
  }
});

test("attachments[0] is inline markdown with Why-it's-hot and Use-it-for per repo", () => {
  const signal = transformTrendingDigest({
    window: "weekly",
    capturedAt: Date.UTC(2026, 4, 6),
    repos: FIXTURE,
  });

  const att = signal.attachments?.[0];
  assert.ok(att, "expected attachments[0]");
  assert.equal(att.type, "inline");
  assert.equal(att.mime_type, "text/markdown");
  assert.ok("data" in att && typeof att.data === "string");
  const md = att.data as string;
  for (const r of FIXTURE) {
    assert.ok(md.includes(r.full_name), `markdown should mention ${r.full_name}`);
  }
  const whyHotCount = (md.match(/Why it's hot/g) ?? []).length;
  const useItForCount = (md.match(/Use it for/g) ?? []).length;
  assert.equal(whyHotCount, FIXTURE.length);
  assert.equal(useItForCount, FIXTURE.length);
});

test("attachments[1] is a reference to the live trending URL", () => {
  const signal = transformTrendingDigest({
    window: "weekly",
    capturedAt: Date.UTC(2026, 4, 6),
    repos: FIXTURE,
  });
  const ref = signal.attachments?.[1];
  assert.ok(ref);
  assert.equal(ref.type, "reference");
  assert.equal(
    "uri" in ref ? ref.uri : undefined,
    "https://github.com/trending?since=weekly",
  );
});
