import type { JellyBlobMascotProps } from "feral-blob";

/** Drive gaze/mood from focused form fields — same pattern as [FeralUI Blob](https://feralui.dev/blob). */
export function jellyFormCompanionProps(
  field: string | null,
  typing: boolean,
): Pick<JellyBlobMascotProps, "mood" | "gaze" | "nod"> {
  const isPassword = field === "password" || field === "confirmPassword";
  const isEmail = field === "email" || field === "name";

  if (isPassword) {
    return {
      mood: "password",
      gaze: { x: 16, y: -10 },
      nod: false,
    };
  }

  if (isEmail) {
    return {
      mood: typing ? "curious" : "neutral",
      gaze: { x: 18, y: -8 },
      nod: typing,
    };
  }

  return { mood: "neutral", gaze: { x: 0, y: 0 }, nod: false };
}
