CREATE TABLE IF NOT EXISTS "NotificationRead" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "notificationId" varchar(80) NOT NULL,
  "readAt" timestamp DEFAULT now() NOT NULL,
  "userId" uuid NOT NULL REFERENCES "User"("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "NotificationRead_user_notification"
  ON "NotificationRead" ("userId", "notificationId");
