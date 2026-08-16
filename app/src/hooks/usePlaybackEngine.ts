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
 * of the two windows once locked), and exposes play/step/speed/lock
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

        // first pass: read where each player actually is, and whether any
        // of them has drifted past its loop boundary.
        const info: Partial<Record<Slot, { start: number; len: number; t: number; d: number }>> = {};
        let needsLoop = false;
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
          const start = c.in * d;
          const len = Number.isFinite(lim) ? lim : (c.out - c.in) * d;
          const t = playerFor(s).currentTime;
          info[s] = { start, len, t, d };
          // upper bound uses a small tolerance (not a strict `>`) so a clip
          // that lands exactly on its window end (float precision, or a
          // window that runs to the very end of the source) still loops
          // back instead of sitting stuck at the boundary forever. Gated on
          // `playing` — otherwise a manual seek that lands exactly on the
          // out point (e.g. releasing the trim-out handle) falls inside
          // this same tolerance and gets mistaken for drift, snapping the
          // playhead back to `in` right after the user let go.
          if (playing && (t < start - 0.08 || t > start + len - 0.05)) needsLoop = true;
        });

        // when locked, a loop on either side restarts BOTH players together,
        // not just the one that crossed its boundary. Each corrective seek
        // below has its own (variable) latency, so looping each side only
        // when it individually drifts lets L and R slowly fall out of sync
        // over many loops — resetting both in lockstep is the fix.
        const resetAll = session.locked && needsLoop;

        SLOTS.forEach((s) => {
          const entry = info[s];
          if (!entry) return;
          const { start, len, d } = entry;
          let t = entry.t;
          if (playing && (resetAll || t < start - 0.08 || t > start + len - 0.05)) {
            const player = playerFor(s);
            t = start;
            // loop-restart seeks don't need frame accuracy, just to land
            // near the window start — an exact seek forces the decoder to
            // walk forward from the nearest keyframe, which is what causes
            // the visible stutter (and its inconsistent duration is what
            // lets L/R drift). A loose tolerance lets the player snap to a
            // nearby keyframe instead, so restore it to exact right after
            // for the next user-driven seek/step.
            player.seekTolerance = { toleranceBefore: 0, toleranceAfter: 0.3 };
            player.currentTime = t;
            player.seekTolerance = { toleranceBefore: 0, toleranceAfter: 0 };
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
  }, [session.locked, session.clips, durationFor, playerFor, windowLen, playing]);

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

  // Scrubbing mode trades buffering for seek latency so currentTime writes
  // during a drag actually paint each intermediate frame instead of only
  // settling on the last one once the finger stops moving.
  const setScrubbing = useCallback(
    (on: boolean) => {
      SLOTS.forEach((s) => {
        playerFor(s).scrubbingModeOptions = { scrubbingModeEnabled: on };
      });
    },
    [playerFor]
  );

  const togglePlay = useCallback(() => applyPlayState(!playing), [applyPlayState, playing]);
  const pause = useCallback(() => applyPlayState(false), [applyPlayState]);

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

  // Speed always applies to both clips, not just session.activeSlots —
  // playing L and R back at different rates would drift them out of the
  // sync a coach is trying to compare, so there's no case where a
  // per-slot speed makes sense.
  const setSpeed = useCallback(
    (n: number) => {
      SLOTS.forEach((s) => {
        session.patchSlot(s, { speed: n });
        playerFor(s).playbackRate = n;
      });
    },
    [session, playerFor]
  );

  // Overlay's top/bottom panes both play continuously and are only
  // corrected back in sync at loop boundaries (see the interval above), so
  // small drift between L and R inside a window is otherwise never
  // corrected. That drift is invisible while a slot sits fully covered
  // underneath the opaque bottom pane, but swapping which slot is on top
  // suddenly exposes it as an apparent frame jump — so snap both players to
  // the same elapsed offset (measured from whichever slot is on top right
  // now, to preserve what's currently on screen) right before the swap.
  const resyncSlots = useCallback(() => {
    const lim = Math.min(windowLen("L"), windowLen("R"));
    if (!Number.isFinite(lim) || lim <= 0) return;
    const refSlot = session.top;
    const refDuration = durationFor(refSlot);
    if (!refDuration) return;
    const refClip = session.clips[refSlot];
    const elapsed = Math.min(lim, Math.max(0, playerFor(refSlot).currentTime - refClip.in * refDuration));
    SLOTS.forEach((s) => {
      const d = durationFor(s);
      if (!d) return;
      const c = session.clips[s];
      playerFor(s).currentTime = c.in * d + elapsed;
    });
  }, [session.clips, session.top, windowLen, durationFor, playerFor]);

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
    pause,
    seek,
    setScrubbing,
    step,
    setSpeed,
    handleLock,
    resyncSlots,
    windowLen,
  };
}
