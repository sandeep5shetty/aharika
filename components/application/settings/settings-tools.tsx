"use client";

import { RiWhatsappLine } from "@remixicon/react";

import { SettingsUnderConstruction } from "./settings-under-construction";

/** Tools settings — WhatsApp meal logging and reminders (coming soon). */
export function SettingsTools() {
  return (
    <SettingsUnderConstruction
      icon={RiWhatsappLine}
      title="WhatsApp"
      description="Log meals by messaging Aharika on WhatsApp, and get reminders for breakfast, lunch, and dinner. This connection is coming soon."
    />
  );
}
