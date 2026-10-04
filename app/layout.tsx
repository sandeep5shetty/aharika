import type { Metadata } from "next";
import { Instrument_Serif, Inter, JetBrains_Mono } from "next/font/google";
import { BoardUIThemeScript } from "@/components/foundations/theme/boardui-theme-script";
import { DirectionProvider } from "@/components/foundations/direction/direction";
import { GuestUpgradeProvider } from "@/components/application/auth/guest-upgrade-provider";
import { LogOutConfirmProvider } from "@/components/application/auth/log-out-confirm-provider";
import { AuthSessionProvider } from "@/components/application/auth/session-provider";
import { NotificationToastProvider } from "@/components/application/notification-toast";

import "feral-blob/blob.css";
import "@/styles/feral-jelly-theme.css";
import "@/styles/globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  axes: ["opsz"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono-source",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif-source",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Aharika",
  description: "Your AI nutrition coach — log meals, track progress, and get personalized guidance.",
  icons: {
    icon: [
      { url: "/brand/aharika-favicon.svg", type: "image/svg+xml" },
      { url: "/brand/aharika-favicon.svg", sizes: "32x32", type: "image/svg+xml" },
    ],
    apple: [{ url: "/brand/aharika-favicon.svg", type: "image/svg+xml" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en-US"
      dir="ltr"
      className={`${inter.variable} ${jetbrainsMono.variable} ${instrumentSerif.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <BoardUIThemeScript />
      </head>
      <body className="flex min-h-full flex-col font-sans">
        <DirectionProvider locale="en-US">
          <AuthSessionProvider>
            <GuestUpgradeProvider>
              <LogOutConfirmProvider>
                <NotificationToastProvider>{children}</NotificationToastProvider>
              </LogOutConfirmProvider>
            </GuestUpgradeProvider>
          </AuthSessionProvider>
        </DirectionProvider>
      </body>
    </html>
  );
}
