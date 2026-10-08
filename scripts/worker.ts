/**
 * Background worker: runs scheduled jobs (listing expiry, saved-search digests, rent dues
 * and reminders, campaign ends, notification delivery, cleanup).
 *   npm run worker          -> loop every 2 minutes
 *   npm run worker -- --once
 */
import { getDb, closeDb } from "@propertyx/database";
import { runScheduledJobs } from "@propertyx/core";

const once = process.argv.includes("--once");
const INTERVAL = Number(process.env.WORKER_INTERVAL_MS ?? 120_000);

async function tick() {
  const started = Date.now();
  const r = await runScheduledJobs(getDb());
  console.log(`[worker] ${new Date().toISOString()} done in ${Date.now() - started}ms`, r);
}

if (once) {
  tick()
    .catch((e) => {
      console.error(e);
      process.exitCode = 1;
    })
    .finally(() => closeDb());
} else {
  const loop = async () => {
    try {
      await tick();
    } catch (e) {
      console.error("[worker] tick failed", e);
    }
    setTimeout(loop, INTERVAL);
  };
  loop();
}
