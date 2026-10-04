CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE TYPE "public"."confidence_level" AS ENUM('High', 'Medium', 'Low');--> statement-breakpoint
CREATE TYPE "public"."food_source" AS ENUM('indb', 'ifct');--> statement-breakpoint
CREATE TYPE "public"."meal_type" AS ENUM('breakfast', 'lunch', 'dinner', 'snack');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "FoodItem" (
	"aliases" text[] DEFAULT '{}' NOT NULL,
	"carbsG" double precision NOT NULL,
	"fatG" double precision NOT NULL,
	"fiberG" double precision DEFAULT 0 NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kcalPer100g" double precision NOT NULL,
	"name" text NOT NULL,
	"proteinG" double precision NOT NULL,
	"servingGrams" double precision,
	"servingUnit" text,
	"source" "food_source" NOT NULL,
	"sourceCode" varchar(64)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "FoodItem_name_trgm_idx" ON "FoodItem" USING gin ("name" gin_trgm_ops);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Goal" (
	"calories" integer NOT NULL,
	"carbsG" integer NOT NULL,
	"fatG" integer NOT NULL,
	"fiberG" integer NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"isDefault" boolean DEFAULT false NOT NULL,
	"proteinG" integer NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"userId" uuid NOT NULL,
	CONSTRAINT "Goal_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Meal" (
	"calories" double precision NOT NULL,
	"carbsG" double precision NOT NULL,
	"chatId" uuid,
	"confidence" "confidence_level" NOT NULL,
	"fatG" double precision NOT NULL,
	"fiberG" double precision NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"items" jsonb NOT NULL,
	"loggedAt" timestamp DEFAULT now() NOT NULL,
	"mealType" "meal_type" NOT NULL,
	"proteinG" double precision NOT NULL,
	"rawText" text NOT NULL,
	"userId" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Nudge" (
	"date" varchar(10) NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mealType" "meal_type" NOT NULL,
	"sentAt" timestamp DEFAULT now() NOT NULL,
	"userId" uuid NOT NULL,
	CONSTRAINT "Nudge_userId_mealType_date_unique" UNIQUE("userId","mealType","date")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "UserMemorySummary" (
	"generatedAt" timestamp DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mealsSinceSummary" integer DEFAULT 0 NOT NULL,
	"summary" jsonb NOT NULL,
	"userId" uuid NOT NULL,
	CONSTRAINT "UserMemorySummary_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "UserPreference" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"timezone" varchar(64) DEFAULT 'Asia/Kolkata' NOT NULL,
	"userId" uuid NOT NULL,
	CONSTRAINT "UserPreference_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Meal" ADD CONSTRAINT "Meal_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Meal" ADD CONSTRAINT "Meal_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Nudge" ADD CONSTRAINT "Nudge_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "UserMemorySummary" ADD CONSTRAINT "UserMemorySummary_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
