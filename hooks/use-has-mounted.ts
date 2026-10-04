import { useSyncExternalStore } from "react";

/** False during SSR and the first client render so markup matches before hydration. */
export function useHasMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}
