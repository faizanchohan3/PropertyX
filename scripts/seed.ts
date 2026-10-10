/**
 * npm run db:seed                 -> wipe + reference data + demo data + post-processing
 * npm run db:seed -- --reference-only   -> only idempotent reference data (safe for production)
 */
import { createDb } from "@propertyx/database";
import { syncReferenceData } from "@propertyx/database/reference";
import { seedDemo } from "@propertyx/database/seed/index";
import { postSeed } from "./post-seed";
import { existsSync } from "node:fs";

// variables already set in the shell win over .env
if (existsSync(".env")) process.loadEnvFile(".env");

async function main() {
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL || "postgres://propertyx:propertyx_dev@127.0.0.1:54329/propertyx";
  const { db, sql } = createDb(url);
  const t = Date.now();
  try {
    if (process.argv.includes("--reference-only")) {
      await syncReferenceData(db);
      console.log("✔ reference data synced");
      return;
    }
    if (process.env.NODE_ENV === "production" && !process.argv.includes("--force")) {
      throw new Error("Refusing to load demo data in production. Use --reference-only, or --force if you really mean it.");
    }
    await seedDemo(db);
    await postSeed(db);
    console.log(`Done in ${((Date.now() - t) / 1000).toFixed(1)}s`);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
