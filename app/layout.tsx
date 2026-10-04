import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { BoardUIThemeScript } from "@/components/foundations/theme/boardui-theme-script";
import { DirectionProvider } from "@/components/foundations/direction/direction";

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

export const metadata: Metadata = {
  title: "Chat",
  description: "A streaming AI chat on your own model key, built with BoardUI.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en-US"
      dir="ltr"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <BoardUIThemeScript />
      </head>
      <body className="flex min-h-full flex-col font-sans">
        <DirectionProvider locale="en-US">{children}</DirectionProvider>
      </body>
    </html>
  );
}
