"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useStarterBase } from "@/components/application/app-shell/app-shell";
import { AuthCard } from "@/components/application/auth/auth-card";
import { AuthMediaCarousel } from "@/components/application/auth/auth-media-carousel";
import { CHAT_PATH, withBasePath } from "@/lib/constants";
import { signInWithCredentials } from "@/lib/auth-client";
import { queueToastAfterNavigation } from "@/lib/notification-toast/show-toast";

export default function SignupPage() {
  const base = useStarterBase();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const afterAuth = `${base}${CHAT_PATH}`;

  const handleSubmit = async (data: FormData) => {
    setError(null);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    const confirmPassword = String(data.get("confirmPassword") ?? "");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(withBasePath("/api/auth/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        setError(payload.error ?? "Could not create account. Please try again.");
        setIsSubmitting(false);
        return;
      }

      const result = await signInWithCredentials(email, password);
      setIsSubmitting(false);

      if (result?.error) {
        setError("Account created but sign-in failed. Try signing in.");
        return;
      }

      router.push(afterAuth);
      router.refresh();
    } catch {
      setIsSubmitting(false);
      setError("Something went wrong. Please try again.");
    }
  };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background-full p-6">
      <AuthCard
        mode="signup"
        layout="grid"
        centered
        confirmPassword
        providers={[]}
        title="Create your account"
        description="Enter your email below to create your account"
        switchHref={`${base}/login`}
        onSubmit={handleSubmit}
        error={error ?? undefined}
        isSubmitting={isSubmitting}
        footnote={
          <>
            By clicking continue, you agree to our Terms of Service and Privacy
            Policy.
          </>
        }
        media={
          <AuthMediaCarousel
            slides={[
              { src: "/carousel/floral.webp" },
              { src: "/carousel/space-squid.webp" },
              { src: "/carousel/sunrise.webp" },
              { src: "/carousel/shark-collage.webp" },
              { src: "/carousel/kitchen.webp" },
              { src: "/carousel/seafood.webp" },
              { src: "/carousel/vending-machine.webp" },
            ]}
          />
        }
      />
    </main>
  );
}
