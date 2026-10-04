"use client";

import {
  BlobSpeech,
  JellyBlobMascot,
  type JellyBlobMascotProps,
  type JellyBlobMood,
} from "feral-blob";
import { useCallback, useState } from "react";
import { useHasMounted } from "@/hooks/use-has-mounted";
import { cx } from "@/utils/cx";

const SIZE_PX = {
  xs: 32,
  /** Profile avatar md (32px). */
  avatar: 32,
  /** Profile avatar lg (36px). */
  avatarLg: 36,
  /** Sidebar brand row — between avatar md (32) and compact auth sm (72). */
  sidebar: 52,
  /** Collapsed rail (36px column). */
  sidebarCollapsed: 36,
  sm: 72,
  md: 96,
  lg: 128,
} as const;

export type FeralJellySize = keyof typeof SIZE_PX;

export function FeralJellyBlob({
  size = "md",
  className,
  ...props
}: JellyBlobMascotProps & {
  size?: FeralJellySize;
}) {
  const mounted = useHasMounted();
  const px = SIZE_PX[size];
  return (
    <div
      className={cx(
        "feral-jelly-mint inline-flex shrink-0 items-center justify-center",
        className,
      )}
      style={{ width: px, height: px }}
      aria-hidden
    >
      {mounted ? <JellyBlobMascot className="h-full w-full" {...props} /> : null}
    </div>
  );
}

const BUBBLE_H = 56;

/** Blob + speech cloud (FeralUI empty-state pattern). */
export function FeralJellyWithSpeech({
  speech,
  mood = "curious",
  size = "lg",
  className,
  onPoke: onPokeProp,
  ...blobProps
}: {
  speech: string;
  mood?: JellyBlobMood;
  size?: FeralJellySize;
  className?: string;
} & Omit<JellyBlobMascotProps, "mood">) {
  const mounted = useHasMounted();
  const px = SIZE_PX[size];
  const [speechVisible, setSpeechVisible] = useState(false);

  const handlePoke = useCallback(() => {
    onPokeProp?.();
    setSpeechVisible(true);
  }, [onPokeProp]);

  const blockHeight = speechVisible ? BUBBLE_H + px + 4 : px;

  if (!mounted) {
    return (
      <div
        className={cx("shrink-0", className)}
        style={{ width: px, height: blockHeight }}
        aria-hidden
      />
    );
  }

  const messages = { [mood]: speech } as Partial<Record<JellyBlobMood, string>>;

  return (
    <div className={cx("flex flex-col items-center gap-1", className)}>
      {speechVisible ? <BlobSpeech mood={mood} messages={messages} /> : null}
      <FeralJellyBlob size={size} mood={mood} onPoke={handlePoke} {...blobProps} />
    </div>
  );
}

/** Default mark for auth cards and compact logo slots. */
export function FeralBlobLogo(
  props: Omit<JellyBlobMascotProps, "className"> & {
    className?: string;
    size?: FeralJellySize;
  },
) {
  const { size = "sm", mood = "happy", ...rest } = props;
  return <FeralJellyBlob size={size} mood={mood} {...rest} />;
}
