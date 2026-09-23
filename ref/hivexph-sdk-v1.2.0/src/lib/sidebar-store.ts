import { useSyncExternalStore } from "react";

/**
 * Shared sidebar visibility store so the collapse toggle can live in the
 * top navigation tab strip (Solana-docs style) while the sidebar itself
 * renders inside the docs/playground layouts.
 *
 * null = "use the viewport default" (open on desktop, closed on smaller screens).
 */
type Listener = () => void;

const listeners = new Set<Listener>();
let open: boolean | null = null;

function emit() {
  listeners.forEach((listener) => listener());
}

export function setSidebarOpen(value: boolean | null) {
  open = value;
  emit();
}

export function toggleSidebar(currentlyVisible: boolean) {
  setSidebarOpen(!currentlyVisible);
}

export function subscribeSidebar(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSidebarSnapshot() {
  return open;
}

export function useSidebarOpen() {
  return useSyncExternalStore(subscribeSidebar, getSidebarSnapshot, () => null);
}

/** Same breakpoint SideNav uses: <=1279px behaves as the mobile drawer. */
export function isMobileViewport() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 1279px)").matches;
}
