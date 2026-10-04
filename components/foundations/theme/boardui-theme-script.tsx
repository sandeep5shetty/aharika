"use client";

import { useSyncExternalStore } from "react";

const THEME_INIT_SCRIPT = `(function(){try{var dark=localStorage.getItem("boardui:theme")==="dark";document.documentElement.classList.toggle("dark",dark)}catch(e){document.documentElement.classList.remove("dark")}})();`;

/** True only for SSR + the matching hydration pass (React 19 safe). */
function useEmitBlockingScript() {
  return useSyncExternalStore(
    () => () => {},
    () => false,
    () => true,
  );
}

export function BoardUIThemeScript() {
  if (!useEmitBlockingScript()) return null;
  return (
    <script
      id="boardui-theme"
      dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
    />
  );
}
