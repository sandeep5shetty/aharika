ALTER TABLE "UserPreference" ADD COLUMN IF NOT EXISTS "coachMemoryEnabled" boolean DEFAULT true NOT NULL;
ALTER TABLE "UserPreference" ADD COLUMN IF NOT EXISTS "mealNudgesEnabled" boolean DEFAULT true NOT NULL;
