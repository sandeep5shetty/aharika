ALTER TABLE "UserPreference" ADD COLUMN IF NOT EXISTS "sex" varchar(8);
ALTER TABLE "UserPreference" ADD COLUMN IF NOT EXISTS "age" integer;
ALTER TABLE "UserPreference" ADD COLUMN IF NOT EXISTS "weightKg" double precision;
ALTER TABLE "UserPreference" ADD COLUMN IF NOT EXISTS "heightCm" double precision;
ALTER TABLE "UserPreference" ADD COLUMN IF NOT EXISTS "activity" varchar(16);
