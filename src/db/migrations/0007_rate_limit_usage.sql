CREATE TABLE IF NOT EXISTS "rate_limit_windows" (
  "bucket_key" text PRIMARY KEY NOT NULL,
  "window_start" timestamp NOT NULL,
  "count" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "llm_usage_daily" (
  "company_id" text NOT NULL,
  "day" text NOT NULL,
  "total_tokens" integer DEFAULT 0 NOT NULL,
  "request_count" integer DEFAULT 0 NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "llm_usage_daily_company_id_day_pk" PRIMARY KEY ("company_id", "day")
);
