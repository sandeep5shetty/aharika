"use client";

import { useStarterBase } from "@/components/application/app-shell/app-shell";
import { AuthCard } from "@/components/application/auth/auth-card";

export default function LoginPage() {
  const base = useStarterBase();
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background-full p-6">
      <AuthCard switchHref={`${base}/signup`} />
    </main>
  );
}
