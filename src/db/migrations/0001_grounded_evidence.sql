ALTER TABLE "brand_profiles" ADD COLUMN IF NOT EXISTS "evidence" jsonb DEFAULT '[]'::jsonb;
