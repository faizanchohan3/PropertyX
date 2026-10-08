/** Stops the local embedded PostgreSQL started by `npm run db:start` (even if its parent process was killed). */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const bin = path.resolve("node_modules/@embedded-postgres", process.platform === "win32" ? "windows-x64" : `${process.platform}-${process.arch}`, "native/bin", process.platform === "win32" ? "pg_ctl.exe" : "pg_ctl");
const dataDir = path.resolve(".data/pg");
if (!existsSync(bin)) throw new Error(`pg_ctl not found at ${bin}`);
try {
  execFileSync(bin, ["-D", dataDir, "stop", "-m", "fast"], { stdio: "inherit" });
} catch {
  console.log("PostgreSQL was not running.");
}
