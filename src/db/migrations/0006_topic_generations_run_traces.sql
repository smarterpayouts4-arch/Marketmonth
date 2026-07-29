CREATE TABLE IF NOT EXISTS "topic_generations" (
  "generation_id" text PRIMARY KEY NOT NULL,
  "company_id" text NOT NULL,
  "domain" text NOT NULL,
  "normalized_input_topic" text,
  "comparison_group_id" text,
  "status" text NOT NULL,
  "record_revision" integer NOT NULL,
  "record" jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "topic_generations_company_idx"
  ON "topic_generations" ("company_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "topic_generations_comparison_idx"
  ON "topic_generations" ("comparison_group_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "content_run_traces" (
  "run_id" text PRIMARY KEY NOT NULL,
  "company_id" text,
  "workflow_version" text NOT NULL,
  "final_status" text NOT NULL,
  "trace" jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "content_run_traces_company_idx"
  ON "content_run_traces" ("company_id", "created_at");
