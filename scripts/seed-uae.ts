/**
 * npm run db:demo-uae   (with NEXT_PUBLIC_COUNTRY=ae and the UAE DATABASE_URL)
 * Adds fictional UAE demo agencies, agents, projects and listings. Does not delete anything.
 */
import "./load-env";
import { createDb } from "@propertyx/database";
import { COUNTRY } from "@propertyx/shared";
import { seedUaeDemo } from "@propertyx/database/seed/uae";
import { refreshLocationCounts } from "@propertyx/core";

async function main() {
  if (COUNTRY.code !== "ae") throw new Error("Set NEXT_PUBLIC_COUNTRY=ae — this loads UAE demo data.");
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL || "postgres://propertyx:propertyx_dev@127.0.0.1:54329/propertyx_ae";
  const { db, sql } = createDb(url);
  try {
    const r = await seedUaeDemo(db);
    await refreshLocationCounts(db);
    console.log(`✔ UAE demo data loaded. Demo logins (password ${r.password}): ${r.accounts.join(", ")}`);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
