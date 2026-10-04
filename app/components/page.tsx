"use client";

import { useState } from "react";
import {
  AppShell,
  CatalogTierFilter,
  ComponentsCatalog,
  type CatalogTier,
} from "@/components/application/app-shell/app-shell";

export default function ComponentsPage() {
  const [tier, setTier] = useState<CatalogTier>("all");
  return (
    <AppShell
      title="Components and Blocks"
      actions={<CatalogTierFilter tier={tier} onChange={setTier} />}
      columnClassName="max-w-[964px]"
    >
      <ComponentsCatalog tier={tier} />
    </AppShell>
  );
}
