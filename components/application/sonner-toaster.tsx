"use client";

import { Toaster } from "sonner";

export function SonnerToaster() {
  return (
    <Toaster
      position="top-center"
      theme="system"
      toastOptions={{
        classNames: {
          toast:
            "bg-background-primary-default text-text-primary border border-border-button-default shadow-xs",
        },
      }}
    />
  );
}
