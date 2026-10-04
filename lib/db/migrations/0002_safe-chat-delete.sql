ALTER TABLE "Meal" DROP CONSTRAINT "Meal_chatId_Chat_id_fk";
--> statement-breakpoint
ALTER TABLE "Meal" ADD CONSTRAINT "Meal_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("id") ON DELETE set null ON UPDATE no action;