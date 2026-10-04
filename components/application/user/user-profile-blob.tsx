"use client";

import type { JellyBlobMood } from "feral-blob";

import { Avatar } from "@/components/base/avatar/avatar";
import { FeralJellyBlob } from "@/components/foundations/feral-blob/feral-jelly-blob";
import { cx } from "@/utils/cx";

const BLOB_THEMES = [
  "feral-jelly-mint",
  "feral-jelly-sky",
  "feral-jelly-violet",
  "feral-jelly-coral",
  "feral-jelly-amber",
  "feral-jelly-teal",
] as const;

const BLOB_MOODS: JellyBlobMood[] = ["happy", "curious", "shy", "wave", "love"];

function hashString(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function userBlobSeedFromSession(user?: {
  id?: string;
  email?: string | null;
  type?: string;
}) {
  if (!user) return "anonymous";
  if (user.type === "guest") return "guest";
  return user.id ?? user.email ?? "member";
}

export function UserProfileBlob({
  seed,
  src,
  alt = "",
  size = "md",
  className,
}: {
  /** Stable id for picking color/mood (user id or email). */
  seed: string;
  src?: string;
  alt?: string;
  size?: "md" | "lg";
  className?: string;
}) {
  if (src) {
    return <Avatar size={size} src={src} alt={alt} className={className} />;
  }

  const hash = hashString(seed);
  const theme = BLOB_THEMES[hash % BLOB_THEMES.length];
  const mood = BLOB_MOODS[hash % BLOB_MOODS.length];
  const jellySize = size === "lg" ? "avatarLg" : "avatar";

  return (
    <span
      className={cx(
        "inline-flex shrink-0 overflow-hidden rounded-full bg-background-secondary-default",
        size === "lg" ? "size-9" : "size-8",
        className,
      )}
      aria-hidden={alt === ""}
      title={alt || undefined}
    >
      <span className={cx(theme, "flex size-full items-center justify-center [&_svg]:scale-[1.15]")}>
        <FeralJellyBlob size={jellySize} mood={mood} stillBody happyEyes="smile" />
      </span>
    </span>
  );
}
