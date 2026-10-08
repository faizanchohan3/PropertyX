import postgres from "postgres";
const sql = postgres(process.env.DATABASE_URL ?? "postgres://propertyx:propertyx_dev@127.0.0.1:54329/propertyx");
const r = await sql.unsafe(process.argv[2]);
console.table(r); await sql.end();
