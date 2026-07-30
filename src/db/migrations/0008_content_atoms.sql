CREATE TABLE IF NOT EXISTS "content_atoms" (
  "atom_id" text NOT NULL,
  "atom_version" integer NOT NULL,
  "company_id" text NOT NULL,
  "approval_status" text NOT NULL,
  "build_status" text NOT NULL,
  "record_revision" integer NOT NULL,
  "record" jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  PRIMARY KEY ("atom_id", "atom_version")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "content_atoms_company_idx"
  ON "content_atoms" ("company_id", "updated_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "content_atoms_company_atom_idx"
  ON "content_atoms" ("company_id", "atom_id");
