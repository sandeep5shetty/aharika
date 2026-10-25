"use client";

import { useTemplateCopy } from "@/components/foundations/template-copy/template-copy";

import { ThemeToggle } from "@/components/application/theme/theme-toggle";
import {
  SettingsCard,
  SettingsRow,
  SettingsSectionLabel,
  SettingsValueField,
} from "./settings-rows";

/** Aharika general preferences — appearance and nutrition display units. */
export function SettingsGeneral() {
  const localize = useTemplateCopy();

  return localize((
    <div className="flex w-full flex-col gap-6">
      <div className="flex w-full flex-col gap-2">
        <SettingsSectionLabel>Appearance</SettingsSectionLabel>
        <SettingsCard>
          <SettingsRow
            label="Theme"
            description="Light or dark. Saved on this device and used across Aharika."
          >
            <ThemeToggle appearance="segmented" size="small" />
          </SettingsRow>
        </SettingsCard>
      </div>

      <div className="flex w-full flex-col gap-2">
        <SettingsSectionLabel>Nutrition display</SettingsSectionLabel>
        <SettingsCard>
          <SettingsRow label="Energy" description="How calories are shown in chat and on the dashboard">
            <SettingsValueField>kcal</SettingsValueField>
          </SettingsRow>
          <SettingsRow label="Macros" description="Protein, carbs, fat, and fiber">
            <SettingsValueField>grams</SettingsValueField>
          </SettingsRow>
          <SettingsRow label="Body measurements" description="Used by the profile estimator">
            <SettingsValueField>kg and cm</SettingsValueField>
          </SettingsRow>
        </SettingsCard>
      </div>
    </div>
  ));
}
