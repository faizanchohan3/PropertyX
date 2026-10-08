/**
 * Local development PostgreSQL using the `embedded-postgres` package.
 * Production deployments should point DATABASE_URL at a managed PostgreSQL
 * instance instead and never run this script.
 *
 *   npm run db:start   -> starts Postgres on 127.0.0.1:54329 and keeps it running
 */
import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";
import path from "node:path";

const dataDir = path.resolve(process.cwd(), ".data/pg");
const port = Number(process.env.DEV_DB_PORT ?? 54329);
const user = "propertyx";
const password = "propertyx_dev";
const database = "propertyx";

async function main() {
  const pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    user,
    password,
    port,
    persistent: true,
    // Windows defaults to WIN1252; the app stores Urdu and other Unicode text.
    initdbFlags: ["--encoding=UTF8", "--locale=C", "--lc-collate=C", "--lc-ctype=C"],
    onLog: () => {},
    onError: (e) => console.error("[postgres]", e),
  });

  const fresh = !existsSync(path.join(dataDir, "PG_VERSION"));
  if (fresh) {
    console.log("Initialising new local database cluster in", dataDir);
    await pg.initialise();
  }
  await pg.start();
  if (fresh) {
    await pg.createDatabase(database);
    await pg.createDatabase(`${database}_test`);
  }
  console.log(`PostgreSQL ready: postgres://${user}:${password}@127.0.0.1:${port}/${database}`);

  const shutdown = async () => {
    console.log("Stopping PostgreSQL…");
    await pg.stop();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  // keep process alive
  setInterval(() => {}, 1 << 30);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
