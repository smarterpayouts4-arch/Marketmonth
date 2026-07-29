CREATE TABLE IF NOT EXISTS "app_metadata" (
	"application_id" text PRIMARY KEY NOT NULL,
	"environment" text NOT NULL,
	"schema_version" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "brand_profiles" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'draft' NOT NULL;
--> statement-breakpoint
ALTER TABLE "brand_profiles" ADD COLUMN IF NOT EXISTS "source_draft_profile_id" text;
--> statement-breakpoint
ALTER TABLE "brand_profiles" ADD COLUMN IF NOT EXISTS "knowledge_hash" text;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "company_publications" (
	"publication_id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"brand_profile_id" text NOT NULL,
	"knowledge_hash" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"previous_brand_profile_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "company_publications" ADD CONSTRAINT "company_publications_brand_profile_id_brand_profiles_id_fk" FOREIGN KEY ("brand_profile_id") REFERENCES "public"."brand_profiles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
