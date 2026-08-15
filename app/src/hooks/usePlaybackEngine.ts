/* eslint-disable react-hooks/immutability --
 * expo-video's VideoPlayer is an intentionally mutable native handle
 * (playbackRate/currentTime are meant to be assigned imperatively, per
 * Expo's own docs) — React Compiler's immutability check doesn't know
 * that and flags every such write in a hook as if it were plain render
 * data. This whole hook exists to drive that imperative API, so a
 * file-level disable is more honest than a line-disable on every write. */
import { useCallback, useEffect, useRef, useState } from "react";
import type { Slot } from "@/data/types";
import { usePlaybackSession } from "@/state/PlaybackSessionContext";
import { useSlotPlayer } from "./useSlotPlayer";
import { useDuration } from "./useDuration";

type Session = ReturnType<typeof usePlaybackSession>;

const SLOTS: Slot[] = ["L", "R"];

/**
 * Owns the two video players and drives them against the session's
 * per-slot trim windows: loops playback within [in, out) (or the shorter
 * of the two windows once locked), and exposes play/step/speed/zoom/lock
 * actions. Ported from the prototype's Component.loop()/play()/onAction
 * handlers.
 */
export function usePlaybackEngine(session: Session) {
  const playerL = useSlotPlayer(session.clips.L.uri);
  const playerR = useSlotPlayer(session.clips.R.uri);
  const durationL = useDuration(playerL);
  const durationR = useDuration(playerR);

  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState<Record<Slot, number>>({ L: 0, R: 0 });
  const [toast, setToast] = useState("");
  const toastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const playerFor = useCallback((slot: Slot) => (slot === "L" ? playerL : playerR), [playerL, playerR]);
  const durationFor = useCallback((slot: Slot) => (slot === "L" ? durationL : durationR), [durationL, durationR]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => setToast(""), 2200);
  }, []);

  const windowLen = useCallback(
    (slot: Slot) => {
      const d = durationFor(slot);
      const c = session.clips[slot];
      return d ? (c.out - c.in) * d : 0;
    },
    [session.clips, durationFor]
  );

  // keep each player's rate in sync with its slot's speed setting.
  useEffect(() => {
    playerL.playbackRate = Math.max(0.1, session.clips.L.speed);
  }, [playerL, session.clips.L.speed]);
  useEffect(() => {
    playerR.playbackRate = Math.max(0.1, session.clips.R.speed);
  }, [playerR, session.clips.R.speed]);

  // the loop: every tick, clamp each active window back to its start once
  // playback drifts past its end (or the shorter of the two, when locked).
  useEffect(() => {
    const id = setInterval(() => {
      let lim = Infinity;
      if (session.locked) {
        SLOTS.forEach((s) => {
          const l = windowLen(s);
          if (l) lim = Math.min(lim, l);
        });
      }
      setPos((prev) => {
        let changed = false;
        const next = { ...prev };
        SLOTS.forEach((s) => {
          const c = session.clips[s];
          const d = durationFor(s);
          if (!d) {
            if (next[s] !== c.in) {
              next[s] = c.in;
              changed = true;
            }
            return;
          }
          const player = playerFor(s);
          const start = c.in * d;
          const len = Number.isFinite(lim) ? lim : (c.out - c.in) * d;
          let t = player.currentTime;
          // upper bound uses a small tolerance (not a strict `>`) so a clip
          // that lands exactly on its window end (float precision, or a
          // window that runs to the very end of the source) still loops
          // back instead of sitting stuck at the boundary forever.
          if (t < start - 0.08 || t > start + len - 0.05) {
            t = start;
            player.currentTime = t;
          }
          const frac = t / d;
          if (next[s] !== frac) {
            next[s] = frac;
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 70);
    return () => clearInterval(id);
  }, [session.locked, session.clips, durationFor, playerFor, windowLen]);

  const applyPlayState = useCallback(
    (on: boolean) => {
      const active = session.activeSlots;
      SLOTS.forEach((s) => {
        const player = playerFor(s);
        if (on && active.includes(s)) {
          player.playbackRate = Math.max(0.1, session.clips[s].speed);
          player.play();
        } else {
          player.pause();
        }
      });
      setPlaying(on);
    },
    [session.activeSlots, session.clips, playerFor]
  );

  const seek = useCallback(
    (slot: Slot, frac: number) => {
      const d = durationFor(slot);
      if (d) playerFor(slot).currentTime = Math.max(0, Math.min(0.999, frac)) * d;
      setPos((prev) => ({ ...prev, [slot]: frac }));
    },
    [durationFor, playerFor]
  );

  const togglePlay = useCallback(() => applyPlayState(!playing), [applyPlayState, playing]);

  const step = useCallback(
    (n: number) => {
      applyPlayState(false);
      session.activeSlots.forEach((s) => {
        const player = playerFor(s);
        player.currentTime = Math.max(0, player.currentTime + n / 30);
      });
    },
    [applyPlayState, session.activeSlots, playerFor]
  );

  const setSpeed = useCallback(
    (n: number) => {
      session.activeSlots.forEach((s) => {
        session.patchSlot(s, { speed: n });
        playerFor(s).playbackRate = n;
      });
    },
    [session, playerFor]
  );

  const setZoom = useCallback(
    (n: number) => {
      session.activeSlots.forEach((s) => session.patchSlot(s, { zoom: n }));
    },
    [session]
  );

  const handleLock = useCallback(() => {
    applyPlayState(false);
    const next = !session.locked;
    session.toggleLock();
    if (next) {
      SLOTS.forEach((s) => seek(s, session.clips[s].in));
      showToast("Locked — looping the shorter window");
    } else {
      showToast(`Unlocked — controls apply to ${session.sel}`);
    }
  }, [applyPlayState, session, seek, showToast]);

  return {
    playerL,
    playerR,
    durationL,
    durationR,
    playing,
    pos,
    toast,
    togglePlay,
    step,
    setSpeed,
    setZoom,
    handleLock,
    windowLen,
  };
}
