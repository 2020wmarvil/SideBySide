import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Clip, Slot } from "@/data/types";

export type SlotState = {
  clipId: string | null;
  uri: string | null;
  title: string;
  tags: string[];
  in: number; // 0..1, fraction of duration
  out: number; // 0..1
  speed: number; // 0.1..1
  zoom: number; // 1..3
  px: number; // pan, clamped -60..60
  py: number;
  mirrored: boolean;
};

const EMPTY_SLOT: SlotState = {
  clipId: null,
  uri: null,
  title: "",
  tags: [],
  in: 0,
  out: 1,
  speed: 1,
  zoom: 1,
  px: 0,
  py: 0,
  mirrored: false,
};

export type DisplayMode = "side" | "overlay";

type PlaybackSessionValue = {
  clips: Record<Slot, SlotState>;
  locked: boolean;
  sel: Slot;
  display: DisplayMode;
  opacity: number;
  top: Slot;

  setSel: (slot: Slot) => void;
  setDisplay: (mode: DisplayMode) => void;
  setOpacity: (n: number) => void;
  swapTop: () => void;
  swapSlots: () => void;
  toggleLock: () => void;
  patchSlot: (slot: Slot, patch: Partial<SlotState> | ((prev: SlotState) => Partial<SlotState>)) => void;
  loadClip: (slot: Slot, clip: Clip, opts?: { keepFraming?: boolean }) => void;

  /** Which slot(s) respond to transport controls right now. */
  activeSlots: Slot[];
};

const PlaybackSessionContext = createContext<PlaybackSessionValue | null>(null);

export function PlaybackSessionProvider({ children }: { children: ReactNode }) {
  const [clips, setClips] = useState<Record<Slot, SlotState>>({
    L: { ...EMPTY_SLOT },
    R: { ...EMPTY_SLOT },
  });
  const [locked, setLocked] = useState(false);
  const [sel, setSel] = useState<Slot>("L");
  const [display, setDisplayState] = useState<DisplayMode>("side");
  const [opacity, setOpacity] = useState(0.5);
  const [top, setTop] = useState<Slot>("R");

  const patchSlot = useCallback(
    (slot: Slot, patch: Partial<SlotState> | ((prev: SlotState) => Partial<SlotState>)) => {
      setClips((prev) => ({
        ...prev,
        [slot]: { ...prev[slot], ...(typeof patch === "function" ? patch(prev[slot]) : patch) },
      }));
    },
    []
  );

  const loadClip = useCallback(
    (slot: Slot, clip: Clip, opts?: { keepFraming?: boolean }) => {
      setClips((prev) => {
        const prevSlot = prev[slot];
        return {
          ...prev,
          [slot]: {
            clipId: clip.id,
            uri: clip.uri,
            title: clip.title,
            tags: clip.tags,
            in: 0,
            out: 1,
            speed: opts?.keepFraming ? prevSlot.speed : 1,
            zoom: opts?.keepFraming ? prevSlot.zoom : 1,
            px: opts?.keepFraming ? prevSlot.px : 0,
            py: opts?.keepFraming ? prevSlot.py : 0,
            mirrored: opts?.keepFraming ? prevSlot.mirrored : false,
          },
        };
      });
    },
    []
  );

  const swapTop = useCallback(() => {
    setTop((t) => (t === "L" ? "R" : "L"));
  }, []);

  // swaps the two slots' entire contents (clip, trim window, speed, zoom,
  // pan) — a full trade of what's on the left vs. the right. `sel` and
  // `top` stay put deliberately: they refer to a physical slot/position,
  // not to whichever clip currently occupies it.
  const swapSlots = useCallback(() => {
    setClips((prev) => ({ L: prev.R, R: prev.L }));
  }, []);

  // Overlay stacks both clips full-screen with no left/right split, so
  // there's no touch target to tell Stage which one you mean — only locked
  // mode (where both clips move together) makes that ambiguity harmless.
  // Guard it here, not just at the call site, so no path can land on
  // overlay while unlocked.
  const setDisplay = useCallback(
    (mode: DisplayMode) => {
      if (mode === "overlay" && !locked) return;
      setDisplayState(mode);
    },
    [locked]
  );

  const toggleLock = useCallback(() => {
    setLocked((l) => {
      const next = !l;
      if (!next) setDisplayState((d) => (d === "overlay" ? "side" : d));
      return next;
    });
  }, []);

  const activeSlots = useMemo<Slot[]>(() => (locked ? ["L", "R"] : [sel]), [locked, sel]);

  const value = useMemo(
    () => ({
      clips,
      locked,
      sel,
      display,
      opacity,
      top,
      setSel,
      setDisplay,
      setOpacity,
      swapTop,
      swapSlots,
      toggleLock,
      patchSlot,
      loadClip,
      activeSlots,
    }),
    [
      clips,
      locked,
      sel,
      display,
      opacity,
      top,
      setDisplay,
      swapTop,
      swapSlots,
      toggleLock,
      patchSlot,
      loadClip,
      activeSlots,
    ]
  );

  return <PlaybackSessionContext.Provider value={value}>{children}</PlaybackSessionContext.Provider>;
}

export function usePlaybackSession() {
  const ctx = useContext(PlaybackSessionContext);
  if (!ctx) throw new Error("usePlaybackSession must be used within a PlaybackSessionProvider");
  return ctx;
}
