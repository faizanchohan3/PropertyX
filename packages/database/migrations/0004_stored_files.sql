CREATE TABLE IF NOT EXISTS "stored_files" (
	"key" text PRIMARY KEY NOT NULL,
	"visibility" text NOT NULL,
	"data" "bytea" NOT NULL,
	"size_bytes" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
