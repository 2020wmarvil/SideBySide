import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useClipLibrary } from "@/data/ClipLibraryContext";
import { usePlaybackSession } from "@/state/PlaybackSessionContext";
import { usePlaybackEngine } from "@/hooks/usePlaybackEngine";
import { useLandscapeLock } from "@/hooks/useLandscapeLock";
import { useImmersiveNavBar } from "@/hooks/useImmersiveNavBar";
import { Stage } from "@/components/playback/Stage";
import { HeaderBar } from "@/components/playback/HeaderBar";
import { TransportBar, type TrackRow } from "@/components/playback/TransportBar";
import { MiniControls } from "@/components/playback/MiniControls";
import { TriesPanel } from "@/components/playback/TriesPanel";
import { Toast } from "@/components/shared/Toast";
import type { Clip, Slot } from "@/data/types";
import { color } from "@/theme";

function formatTime(duration: number, inFrac: number, outFrac: number, posFrac: number) {
  const d = duration || 0;
  const cur = Math.max(0, (posFrac - inFrac) * d);
  const len = Math.max(0, (outFrac - inFrac) * d);
  return `${cur.toFixed(2)} / ${len.toFixed(2)}s`;
}

export default function PlaybackScreen() {
  useLandscapeLock();
  useImmersiveNavBar();

  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { clips: libraryClips, loading } = useClipLibrary();
  const session = usePlaybackSession();

  const [chrome, setChrome] = useState(true);
  const [triesOpen, setTriesOpen] = useState(false);

  const chromeHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideChrome = useCallback(() => {
    setChrome(false);
    if (chromeHideTimer.current) clearTimeout(chromeHideTimer.current);
  }, []);
  // Shows the chrome (if hidden) and (re)arms the auto-hide countdown. Call
  // this from any interaction that should keep the controls up.
  const bumpChrome = useCallback(() => {
    setChrome(true);
    if (chromeHideTimer.current) clearTimeout(chromeHideTimer.current);
    chromeHideTimer.current = setTimeout(() => setChrome(false), 3000);
  }, []);

  useEffect(() => {
    // chrome already starts visible, so this only needs to arm the
    // countdown, not re-set state bumpChrome() also does.
    chromeHideTimer.current = setTimeout(() => setChrome(false), 3000);
    return () => {
      if (chromeHideTimer.current) clearTimeout(chromeHideTimer.current);
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    // Neither slot has ever been picked this session (e.g. a fresh reload
    // landed straight on /playback) — bounce back to the library instead of
    // landing on an empty stage. No auto-fill from the library: slots only
    // ever hold a clip the user explicitly picked.
    if (!session.clips.L.uri && !session.clips.R.uri) {
      router.replace("/");
    }
  }, [loading, session.clips.L.uri, session.clips.R.uri, router]);

  const {
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
  } = usePlaybackEngine(session);

  const activeSlot: Slot = session.locked ? "L" : session.sel;
  const activeClip = session.clips[activeSlot];

  const activeLibraryClip: Clip | null =
    libraryClips.find((c) => c.id === session.clips[activeSlot].clipId) ?? null;
  const tries: Clip[] = activeLibraryClip
    ? libraryClips
        .filter((c) => c.id !== activeLibraryClip.id && c.tags.some((t) => activeLibraryClip.tags.includes(t)))
        .sort((a, b) => b.createdAt - a.createdAt)
    : [];

  // Pan/pinch target whichever slot Stage resolved the touch to, not
  // session.activeSlots — framing a clip is a per-finger, per-clip action
  // and shouldn't be tied to which slot is selected for transport controls.
  // No bumpChrome() here (or in handlePinchEnd below): the chrome should
  // only show/hide from an explicit tap, not as a side effect of framing a
  // shot, which would otherwise flash the UI over every drag/pinch.
  //
  // Stage drives the live drag/pinch entirely on the UI thread via
  // reanimated shared values and only calls back here once, when the
  // gesture ends — committing every intermediate touch-move into session
  // state (and the React re-render that comes with it) was what made
  // panning/zooming feel laggy.
  const handlePanEnd = (slot: Slot, px: number, py: number) => {
    session.patchSlot(slot, { px, py });
  };
  const handlePinchEnd = (slot: Slot, zoom: number) => {
    session.patchSlot(slot, { zoom });
  };

  const handleSelectSlot = (slot: Slot) => {
    if (session.locked || slot === session.sel) return;
    bumpChrome();
    pause();
    session.setSel(slot);
  };

  // Swapping flips which slot renders in the primary position (left in
  // side-by-side, on top in overlay) rather than moving clip data between
  // slots — a pure re-render, so it's instant instead of forcing both
  // players to reload their video source. Resync is only needed for
  // overlay: that's the one case where a slot sits fully hidden behind an
  // opaque pane, letting drift build up invisibly until the swap reveals it.
  const handleSwap = () => {
    if (session.display === "overlay") resyncSlots();
    session.swapTop();
  };

  const handleReplace = (slot: Slot) => {
    if (session.locked) return;
    router.push({ pathname: "/import", params: { slot } });
  };

  const handleMirror = (slot: Slot) => {
    session.patchSlot(slot, (prev) => ({ mirrored: !prev.mirrored }));
  };

  const trackFor = (slot: Slot, label: string): TrackRow => {
    const c = session.clips[slot];
    const duration = slot === "L" ? durationL : durationR;
    return {
      key: slot,
      label,
      labelColor: !session.locked && session.sel === slot ? color.accent : color.textMuted,
      editable: !session.locked,
      inFrac: c.in,
      outFrac: c.out,
      playheadFrac: pos[slot],
      timeText: formatTime(duration, c.in, c.out, pos[slot]),
      onSetIn: (frac) => {
        bumpChrome();
        const next = Math.min(frac, c.out - 0.05);
        session.patchSlot(slot, { in: next });
        seek(slot, next);
      },
      onSetOut: (frac) => {
        bumpChrome();
        const next = Math.max(frac, c.in + 0.05);
        session.patchSlot(slot, { out: next });
        seek(slot, next);
      },
      onScrub: (frac) => {
        bumpChrome();
        seek(slot, frac);
      },
      onScrubStart: () => {
        pause();
        setScrubbing(true);
      },
      onScrubEnd: () => setScrubbing(false),
    };
  };

  let tracks: TrackRow[];
  if (session.locked) {
    // The merged clip's own length is the shorter of the two windows, not
    // clip L's (out - in) — L and R aren't necessarily the same duration,
    // so their trim fractions don't line up 1:1. Rather than show L's own
    // (unrelated) trim window, treat the locked timeline as its own clip
    // spanning the full bar: inFrac/outFrac cover [0, 1] and the playhead
    // is `elapsed / lockedLen`, not a raw fraction of L's duration.
    const lockedLen = Math.min(windowLen("L"), windowLen("R"));
    const cur = Math.max(0, (pos.L - session.clips.L.in) * durationL);
    const mergedFrac = lockedLen > 0 ? Math.max(0, Math.min(1, cur / lockedLen)) : 0;
    tracks = [
      {
        ...trackFor("L", "Locked"),
        editable: false,
        labelColor: color.accent,
        inFrac: 0,
        outFrac: 1,
        playheadFrac: mergedFrac,
        timeText: `${cur.toFixed(2)} / ${lockedLen.toFixed(2)}s`,
        // locked scrubbing moves both clips together, not just L — and
        // `frac` here is a position along the merged bar (0..1 of
        // lockedLen), so it has to be remapped into each clip's own
        // in-relative, own-duration fraction before seeking it.
        onScrub: (frac) => {
          bumpChrome();
          const elapsed = frac * lockedLen;
          session.activeSlots.forEach((s) => {
            const d = s === "L" ? durationL : durationR;
            if (!d) return;
            seek(s, session.clips[s].in + elapsed / d);
          });
        },
      },
    ];
  } else {
    // only the selected clip's controls are live when unlocked, so only its
    // timeline needs to be on screen — showing both just eats space.
    tracks = [trackFor(session.sel, session.sel === "L" ? "Clip L" : "Clip R")];
  }

  return (
    <View style={styles.screen}>
      <StatusBar hidden />
      <Stage
        playerL={playerL}
        playerR={playerR}
        clips={session.clips}
        display={session.display}
        top={session.top}
        opacity={session.opacity}
        sel={session.sel}
        locked={session.locked}
        chrome={chrome}
        topInset={insets.top}
        onTapStage={() => {
          if (chrome) hideChrome();
          else bumpChrome();
          setTriesOpen(false);
        }}
        onPanEnd={handlePanEnd}
        onPinchEnd={handlePinchEnd}
        onSelectSlot={handleSelectSlot}
        onReplace={handleReplace}
      />

      {chrome && (
        <Pressable
          style={{ position: "absolute", left: 0, right: 0, top: 0, paddingTop: insets.top }}
          onPressIn={bumpChrome}
          onPress={hideChrome}
        >
          <HeaderBar
            nameL={session.clips.L.title}
            nameR={session.clips.R.title}
            mirroredL={session.clips.L.mirrored}
            mirroredR={session.clips.R.mirrored}
            top={session.top}
            sel={session.sel}
            locked={session.locked}
            onReplace={handleReplace}
            onMirror={handleMirror}
            onBack={() => router.push("/")}
            onTries={() => setTriesOpen((v) => !v)}
          />
          {triesOpen && (
            <TriesPanel
              activeClip={activeLibraryClip}
              tries={tries}
              targetLabel={activeSlot === "L" ? "left slot" : "right slot"}
              onSelect={(clip) => {
                session.loadClip(activeSlot, clip, { keepFraming: true });
                setTriesOpen(false);
              }}
              onClose={() => setTriesOpen(false)}
            />
          )}
        </Pressable>
      )}

      {chrome && (
        <View
          style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingBottom: insets.bottom }}
          onTouchStart={bumpChrome}
        >
          <TransportBar
            tracks={tracks}
            playing={playing}
            speed={activeClip.speed}
            display={session.display}
            overlayMode={session.display === "overlay"}
            opacity={session.opacity}
            opacityText={`${Math.round(session.opacity * 100)}%`}
            locked={session.locked}
            controlsEnabled
            onPlay={togglePlay}
            onStep={step}
            onSpeedChange={setSpeed}
            onSetDisplay={session.setDisplay}
            onOpacityChange={session.setOpacity}
            onSwap={handleSwap}
            onLock={handleLock}
          />
        </View>
      )}

      {!chrome && (
        <MiniControls playing={playing} bottom={insets.bottom + 12} onPlay={togglePlay} onStep={step} />
      )}

      <Toast message={toast} bottom={chrome ? 132 : 24} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: color.bg,
  },
});
