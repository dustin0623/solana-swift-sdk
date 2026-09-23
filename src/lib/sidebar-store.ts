import { useSyncExternalStore } from "react";

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

export function useSidebarOpen() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    () => open,
    () => null,
  );
}