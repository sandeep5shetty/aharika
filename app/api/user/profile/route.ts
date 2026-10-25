import { z } from "zod";

import { auth } from "@/lib/auth";
import { updateUserName } from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";
import { isGuestSession } from "@/lib/guest-limits";

const patchSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new ChatbotError("unauthorized:chat").toResponse();
  }
  if (isGuestSession(session)) {
    return new ChatbotError("forbidden:auth", { cause: "guest" }).toResponse();
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return new ChatbotError("bad_request:api").toResponse();
  }

  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return new ChatbotError("bad_request:api").toResponse();
  }

  const updated = await updateUserName(session.user.id, parsed.data.name);
  if (!updated?.name) {
    return new ChatbotError("bad_request:database").toResponse();
  }

  return Response.json({ name: updated.name });
}
