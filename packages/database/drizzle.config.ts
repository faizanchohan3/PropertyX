import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema/index.ts",
  out: "./migrations",
  casing: "snake_case",
  dbCredentials: { url: process.env.DIRECT_URL || process.env.DATABASE_URL || "postgres://propertyx:propertyx_dev@127.0.0.1:54329/propertyx" },
  strict: true,
});
