CREATE TABLE IF NOT EXISTS "company_profile_artifacts" (
  "id" text PRIMARY KEY NOT NULL,
  "company_id" text NOT NULL,
  "state" text NOT NULL,
  "csv_text" text NOT NULL,
  "artifact_hash" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "company_profile_artifacts_company_state_idx"
  ON "company_profile_artifacts" ("company_id", "state");
