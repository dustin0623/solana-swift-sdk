import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_RPC_ENDPOINT, HiveClient } from "@package";

const STORAGE_KEY = "hive-sdk-playground:endpoint";

interface HiveContextValue {
  hive: HiveClient;
  endpoint: string;
  setEndpoint: (endpoint: string) => void;
  resetEndpoint: () => void;
}

// Stored on globalThis so hot module replacement (which can leave two copies of
// this module in memory) never produces two distinct contexts — the cause of a
// spurious "useHive must be used inside <HiveProvider>" after an edit.
const globalScope = globalThis as typeof globalThis & {
  __hiveContext?: ReturnType<typeof createContext<HiveContextValue | null>>;
};

const HiveContext =
  globalScope.__hiveContext ??
  (globalScope.__hiveContext = createContext<HiveContextValue | null>(null));

export function HiveProvider({ children }: { children: ReactNode }) {
  const [endpoint, setEndpointState] = useState<string>(DEFAULT_RPC_ENDPOINT);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) setEndpointState(stored);
  }, []);

  const value = useMemo<HiveContextValue>(() => {
    return {
      hive: new HiveClient({ endpoint }),
      endpoint,
      setEndpoint: (next: string) => {
        const trimmed = next.trim() || DEFAULT_RPC_ENDPOINT;
        window.localStorage.setItem(STORAGE_KEY, trimmed);
        setEndpointState(trimmed);
      },
      resetEndpoint: () => {
        window.localStorage.removeItem(STORAGE_KEY);
        setEndpointState(DEFAULT_RPC_ENDPOINT);
      },
    };
  }, [endpoint]);

  return <HiveContext.Provider value={value}>{children}</HiveContext.Provider>;
}

export function useHive(): HiveContextValue {
  const context = useContext(HiveContext);
  if (!context) throw new Error("useHive must be used inside <HiveProvider>");
  return context;
}
