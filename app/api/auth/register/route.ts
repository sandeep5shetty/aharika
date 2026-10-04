import { z } from "zod";
import { createUser, getUser } from "@/lib/db/queries";

const registerSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(request: Request) {
  let body: z.infer<typeof registerSchema>;

  try {
    const json = await request.json();
    const parsed = registerSchema.safeParse(json);
    if (!parsed.success) {
      const message =
        parsed.error.flatten().fieldErrors.password?.[0] ??
        parsed.error.flatten().fieldErrors.email?.[0] ??
        "Invalid registration details.";
      return Response.json({ error: message }, { status: 400 });
    }
    body = parsed.data;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const existing = await getUser(body.email);
  if (existing.length > 0) {
    return Response.json(
      { error: "An account with this email already exists." },
      { status: 409 },
    );
  }

  try {
    await createUser(body.email, body.password);
  } catch {
    return Response.json(
      { error: "Could not create account. Please try again." },
      { status: 500 },
    );
  }

  return Response.json({ ok: true }, { status: 201 });
}
