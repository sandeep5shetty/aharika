import "server-only";

import { getUserById } from "@/lib/db/queries";

/** True when the JWT user id still exists in Postgres (e.g. after a new Neon DB). */
export async function isSessionUserInDatabase(userId: string) {
  const row = await getUserById(userId);
  return row !== null;
}
