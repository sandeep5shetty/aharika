import type { NextAuthConfig } from "next-auth";

import { isDevelopmentEnvironment } from "@/lib/constants";

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const authConfig = {
  basePath: "/api/auth",
  secret:
    process.env.AUTH_SECRET ??
    (isDevelopmentEnvironment ? "aharika-dev-auth-secret" : undefined),
  callbacks: {},
  pages: {
    newUser: `${base}/chat`,
    signIn: `${base}/login`,
  },
  providers: [],
  trustHost: true,
} satisfies NextAuthConfig;
