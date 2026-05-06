/**
 * Manual end-to-end check: hit live github.com/trending once, print the
 * resulting signal, exit. Not shipped in the npm tarball — dev convenience only.
 *
 *   npm run build && npm run smoke -- --cadence daily --top_n 5
 */
import { fetchTrending } from "./fetch-trending.js";
import { transformTrendingDigest } from "./transform.js";

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const cadence = arg("cadence", "weekly") as "daily" | "weekly";
const topN = Number.parseInt(arg("top_n", "10"), 10);

if (cadence !== "daily" && cadence !== "weekly") {
  console.error(`invalid --cadence ${cadence}; must be 'daily' or 'weekly'`);
  process.exit(2);
}

const repos = await fetchTrending(cadence, topN);
const signal = transformTrendingDigest({
  window: cadence,
  capturedAt: Date.now(),
  repos,
});

process.stdout.write(JSON.stringify(signal, null, 2) + "\n");
