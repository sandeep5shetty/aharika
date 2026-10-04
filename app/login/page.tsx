"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useStarterBase } from "@/components/application/app-shell/app-shell";
import { AuthCard } from "@/components/application/auth/auth-card";
import { LinkButton } from "@/components/base/buttons/link-button";
import { CHAT_PATH, withBasePath } from "@/lib/constants";
import { signInWithCredentials } from "@/lib/auth-client";
import {
  queueToastAfterNavigation,
  showToast,
} from "@/lib/notification-toast/show-toast";

export default function LoginPage() {
  const base = useStarterBase();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const afterAuth = `${base}${CHAT_PATH}`;
  const guestHref = withBasePath(
    `/api/auth/guest?redirectUrl=${encodeURIComponent(afterAuth)}`,
  );

  const handleSubmit = async (data: FormData) => {
    setError(null);
    setIsSubmitting(true);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");

    const result = await signInWithCredentials(email, password);
    setIsSubmitting(false);

    if (result?.error) {
      setError("Invalid email or password.");
      showToast({
        title: "Sign in failed",
        description: "Check your email and password and try again.",
        status: "error",
      });
      return;
    }

    router.push(afterAuth);
    router.refresh();
  };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background-full p-6">
      <AuthCard
        providers={[]}
        switchHref={`${base}/signup`}
        onSubmit={handleSubmit}
        error={error ?? undefined}
        isSubmitting={isSubmitting}
        extraAction={
          <LinkButton href={guestHref}>Continue as guest</LinkButton>
        }
      />
    </main>
  );
}
