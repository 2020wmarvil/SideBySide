import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Clip } from "./types";
import { loadClips, saveClips } from "./clipRepository";
import { buildSeedClips } from "./seed";

type ClipLibraryValue = {
  clips: Clip[];
  loading: boolean;
  addClip: (clip: Clip) => Promise<void>;
  updateClip: (id: string, patch: Partial<Clip>) => Promise<void>;
  removeClip: (id: string) => Promise<void>;
};

const ClipLibraryContext = createContext<ClipLibraryValue | null>(null);

export function ClipLibraryProvider({ children }: { children: ReactNode }) {
  const [clips, setClips] = useState<Clip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let loaded = await loadClips();
      if (loaded.length === 0 && __DEV__) {
        loaded = await buildSeedClips();
        await saveClips(loaded);
      }
      if (!cancelled) {
        setClips(loaded);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const addClip = useCallback(async (clip: Clip) => {
    setClips((prev) => {
      const next = [...prev, clip];
      saveClips(next);
      return next;
    });
  }, []);

  const updateClip = useCallback(async (id: string, patch: Partial<Clip>) => {
    setClips((prev) => {
      const next = prev.map((c) => (c.id === id ? { ...c, ...patch } : c));
      saveClips(next);
      return next;
    });
  }, []);

  const removeClip = useCallback(async (id: string) => {
    setClips((prev) => {
      const next = prev.filter((c) => c.id !== id);
      saveClips(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ clips, loading, addClip, updateClip, removeClip }),
    [clips, loading, addClip, updateClip, removeClip]
  );

  return <ClipLibraryContext.Provider value={value}>{children}</ClipLibraryContext.Provider>;
}

export function useClipLibrary() {
  const ctx = useContext(ClipLibraryContext);
  if (!ctx) throw new Error("useClipLibrary must be used within a ClipLibraryProvider");
  return ctx;
}
