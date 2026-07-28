ALTER TABLE "brands" ADD COLUMN IF NOT EXISTS "dev_key" text;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "brands_dev_key_idx" ON "brands" ("dev_key");
