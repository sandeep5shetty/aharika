ALTER TABLE "UserPreference" ADD COLUMN IF NOT EXISTS "dietPattern" varchar(32);
ALTER TABLE "UserPreference" ADD COLUMN IF NOT EXISTS "allergies" jsonb DEFAULT '[]'::jsonb NOT NULL;
ALTER TABLE "UserPreference" ADD COLUMN IF NOT EXISTS "allergyNote" varchar(80);
ALTER TABLE "Nudge" ADD COLUMN IF NOT EXISTS "dismissedAt" timestamp;
