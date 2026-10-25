ALTER TABLE "UserPreference" ADD COLUMN IF NOT EXISTS "whatsappRemindersEnabled" boolean DEFAULT false NOT NULL;
ALTER TABLE "UserPreference" ADD COLUMN IF NOT EXISTS "whatsappScheduledEnabled" boolean DEFAULT false NOT NULL;
ALTER TABLE "UserPreference" ADD COLUMN IF NOT EXISTS "whatsappSmartEnabled" boolean DEFAULT false NOT NULL;
ALTER TABLE "UserPreference" ADD COLUMN IF NOT EXISTS "whatsappBreakfastTime" varchar(5);
ALTER TABLE "UserPreference" ADD COLUMN IF NOT EXISTS "whatsappLunchTime" varchar(5);
ALTER TABLE "UserPreference" ADD COLUMN IF NOT EXISTS "whatsappDinnerTime" varchar(5);

CREATE TABLE IF NOT EXISTS "WhatsappReminder" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "date" varchar(10) NOT NULL,
  "kind" varchar(16) NOT NULL,
  "mealType" "meal_type" NOT NULL,
  "sentAt" timestamp DEFAULT now() NOT NULL,
  "userId" uuid NOT NULL REFERENCES "User"("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WhatsappReminder_user_date_meal_kind"
  ON "WhatsappReminder" ("userId", "date", "mealType", "kind");
