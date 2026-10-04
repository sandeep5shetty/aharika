import type { SettingsPage } from "@/components/application/settings/settings-modal";

export const OPEN_SETTINGS_EVENT = "aharika:open-settings";

export function openSettingsModal(page: SettingsPage = "general") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(OPEN_SETTINGS_EVENT, { detail: { page } }),
  );
}
