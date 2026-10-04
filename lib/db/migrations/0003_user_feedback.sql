CREATE TABLE IF NOT EXISTS "UserFeedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"category" varchar(32) NOT NULL,
	"message" text NOT NULL,
	"contactEmail" varchar(64),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "UserFeedback" ADD CONSTRAINT "UserFeedback_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
