import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { signIn, signOut } from "@/lib/auth";
import { isDevelopmentEnvironment } from "@/lib/constants";
import { isSessionUserInDatabase } from "@/lib/session-user";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawRedirect = searchParams.get("redirectUrl") || "/chat";
  const redirectUrl =
    rawRedirect.startsWith("/") && !rawRedirect.startsWith("//")
      ? rawRedirect
      : "/";

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: !isDevelopmentEnvironment,
  });

  if (token?.id) {
    const userId = String(token.id);
    if (await isSessionUserInDatabase(userId)) {
      const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
      return NextResponse.redirect(new URL(`${base}/`, request.url));
    }
    await signOut({ redirect: false });
  }

  return signIn("guest", { redirect: true, redirectTo: redirectUrl });
}
