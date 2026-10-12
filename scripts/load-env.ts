/**
 * Import this FIRST in scripts: loads the root .env before any package reads process.env at
 * import time (e.g. NEXT_PUBLIC_COUNTRY in @propertyx/shared). Variables already set in the shell win.
 */
import { existsSync } from "node:fs";

if (existsSync(".env")) process.loadEnvFile(".env");
