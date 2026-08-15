import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useClipLibrary } from "@/data/ClipLibraryContext";
import { usePlaybackSession } from "@/state/PlaybackSessionContext";
import { useSlotPlayer } from "@/hooks/useSlotPlayer";
import { useDuration } from "@/hooks/useDuration";
import { Stage } from "@/components/playback/Stage";
import { HeaderBar } from "@/components/playback/HeaderBar";
import { TransportBar, type TrackRow } from "@/components/playback/TransportBar";
import type { Slot } from "@/data/types";
import { color } from "@/theme";

function formatTime(duration: number, inFrac: number, outFrac: number, posFrac: number) {
  const d = duration || 0;
  const cur = Math.max(0, (posFrac - inFrac) * d);
  const len = Math.max(0, (outFrac - inFrac) * d);
  return `${cur.toFixed(2)} / ${len.toFixed(2)}s`;
}

export default function PlaybackScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { clips: libraryClips, loading } = useClipLibrary();
  const session = usePlaybackSession();

  const [chrome, setChrome] = useState(true);
  const [playing] = useState(false);

  useEffect(() => {
    if (loading || libraryClips.length === 0) return;
    if (!session.clips.L.uri) session.loadClip("L", libraryClips[0]);
    if (!session.clips.R.uri) session.loadClip("R", libraryClips[1] ?? libraryClips[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, libraryClips]);

  const playerL = useSlotPlayer(session.clips.L.uri);
  const playerR = useSlotPlayer(session.clips.R.uri);
  const durationL = useDuration(playerL);
  const durationR = useDuration(playerR);

  const activeSlot: Slot = session.locked ? "L" : session.sel;
  const activeClip = session.clips[activeSlot];

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
      playheadFrac: c.in,
      timeText: formatTime(duration ?? 0, c.in, c.out, c.in),
    };
  };

  const tracks: TrackRow[] = session.locked
    ? [{ ...trackFor("L", "Locked"), editable: false, labelColor: color.accent }]
    : [trackFor("L", "Clip L"), trackFor("R", "Clip R")];

  return (
    <View style={styles.screen}>
      <Stage
        playerL={playerL}
        playerR={playerR}
        clips={session.clips}
        display={session.display}
        top={session.top}
        opacity={session.opacity}
        sel={session.sel}
        locked={session.locked}
        onTapStage={() => setChrome((c) => !c)}
      />

      {chrome && (
        <View style={{ position: "absolute", left: 0, right: 0, top: 0, paddingTop: insets.top }}>
          <HeaderBar
            nameL={session.clips.L.title}
            nameR={session.clips.R.title}
            sel={session.sel}
            locked={session.locked}
            display={session.display}
            onSelect={(slot) => !session.locked && session.setSel(slot)}
            onSetDisplay={session.setDisplay}
            onBack={() => router.push("/library")}
            onTries={() => {}}
          />
        </View>
      )}

      {chrome && (
        <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingBottom: insets.bottom }}>
          <TransportBar
            tracks={tracks}
            playing={playing}
            speed={activeClip.speed}
            speedText={`${activeClip.speed.toFixed(2).replace(/0$/, "")}×`}
            zoom={activeClip.zoom}
            overlayMode={session.display === "overlay"}
            opacity={session.opacity}
            opacityText={`${Math.round(session.opacity * 100)}%`}
            locked={session.locked}
            replaceLabel={`Replace ${activeSlot}`}
            controlsEnabled={false}
            onPlay={() => {}}
            onStep={() => {}}
            onSpeedChange={() => {}}
            onZoomChange={() => {}}
            onOpacityChange={() => {}}
            onSwap={session.swapTop}
            onReplace={() => router.push({ pathname: "/record", params: { slot: activeSlot } })}
            onLock={session.toggleLock}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: color.bg,
  },
});
