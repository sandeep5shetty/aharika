import { signIn, signOut } from "next-auth/react";
import { withBasePath } from "@/lib/constants";
import { queueToastAfterNavigation } from "@/lib/notification-toast/show-toast";

export async function signInWithCredentials(email: string, password: string) {
  return signIn("credentials", {
    email,
    password,
    redirect: false,
  });
}

/** Clears the session cookie and navigates to login (hard redirect for reliability). */
export async function signOutToLogin() {
  const loginPath = withBasePath("/login");
  const loginUrl =
    typeof window !== "undefined"
      ? new URL(loginPath, window.location.origin).href
      : loginPath;

  queueToastAfterNavigation({
    title: "Signed out",
    description: "Your session ended. Sign in again anytime to pick up your diary.",
    status: "information",
  });

  try {
    await signOut({ callbackUrl: loginUrl, redirect: false });
  } catch {
    // Still leave the app even if the sign-out request fails.
  }

  window.location.href = loginPath;
}
