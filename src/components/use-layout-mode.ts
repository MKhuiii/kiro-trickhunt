import { useSyncExternalStore } from "react";
import type { LayoutMode } from "../ui";

/** Same breakpoint as the notebook CSS (48rem). */
export const SPREAD_QUERY = "(min-width: 48rem)";

/** Pure: a matching query is the two-page spread, anything else is a single page. */
export function readLayoutMode(list: { readonly matches: boolean } | undefined): LayoutMode {
  return list !== undefined && list.matches ? "spread" : "single";
}

function getList(): MediaQueryList | undefined {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return undefined;
  return window.matchMedia(SPREAD_QUERY);
}

function subscribe(onChange: () => void): () => void {
  const list = getList();
  if (list === undefined) return () => undefined;
  list.addEventListener("change", onChange);
  return () => list.removeEventListener("change", onChange);
}

function getSnapshot(): LayoutMode {
  return readLayoutMode(getList());
}

function getServerSnapshot(): LayoutMode {
  return "single";
}

/** The notebook layout mode. It follows the viewport and is never stored. */
export function useLayoutMode(): LayoutMode {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
