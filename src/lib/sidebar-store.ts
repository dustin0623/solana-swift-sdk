import { useEffect, useState } from "react";

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
  const [value, setValue] = useState<boolean | null>(null);

  useEffect(() => {
    const listener = () => setValue(open);
    listeners.add(listener);
    listener();
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return value;
}