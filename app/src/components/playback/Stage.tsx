import { StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";
import { VideoView, type VideoPlayer } from "expo-video";
import type { Slot } from "@/data/types";
import type { DisplayMode, SlotState } from "@/state/PlaybackSessionContext";
import { color, radius, withAlpha } from "@/theme";

type StageProps = {
  playerL: VideoPlayer;
  playerR: VideoPlayer;
  clips: Record<Slot, SlotState>;
  display: DisplayMode;
  top: Slot;
  opacity: number;
  sel: Slot;
  locked: boolean;
  onTapStage: () => void;
  onPan: (dx: number, dy: number) => void;
  onPinchBegin: () => void;
  onPinchChange: (scale: number) => void;
};

export function Stage({
  playerL,
  playerR,
  clips,
  display,
  top,
  opacity,
  sel,
  locked,
  onTapStage,
  onPan,
  onPinchBegin,
  onPinchChange,
}: StageProps) {
  // onBegin/onChange/onEnd run as UI-thread worklets (auto-workletized by
  // the gesture builder methods) — the prop callbacks are plain JS
  // closures, so they must cross back via runOnJS or they throw.
  //
  // Pan requires the touch to clear its own internal activation distance
  // before it's ever considered active, so a true tap (near-zero movement)
  // never activates it — it fails/cancels without ever reaching onEnd,
  // which only fires for gestures that *were* active. Detecting "was this a
  // tap" from Pan's onEnd was unreliable for exactly that reason. A
  // dedicated Tap gesture, raced against pan+pinch, resolves this properly:
  // whichever one actually activates first wins and cancels the other.
  // onEnd's second arg is `success` — it fires even when the tap fails (e.g.
  // held past maxDuration, or the race lost to pan/pinch), and that firing
  // happens right at the moment of failure, not on release. Not checking it
  // meant a too-long hold called onTapStage once when it timed out.
  const tapGesture = Gesture.Tap()
    .maxDistance(10)
    .onEnd((_e, success) => {
      if (success) runOnJS(onTapStage)();
    });

  const panGesture = Gesture.Pan().onChange((e) => runOnJS(onPan)(e.changeX, e.changeY));

  const pinchGesture = Gesture.Pinch()
    .onBegin(() => runOnJS(onPinchBegin)())
    .onChange((e) => runOnJS(onPinchChange)(e.scale));

  const stageGesture = Gesture.Race(tapGesture, Gesture.Simultaneous(panGesture, pinchGesture));

  const side = display === "side";
  const showSelection = side && !locked;

  const paneStyle = (slot: Slot) => {
    if (side) {
      return {
        left: slot === "L" ? "0%" : "50%",
        width: "50%",
        zIndex: 1,
        opacity: 1,
      } as const;
    }
    const isTop = top === slot;
    return {
      left: "0%",
      width: "100%",
      zIndex: isTop ? 2 : 1,
      opacity: isTop ? opacity : 1,
    } as const;
  };

  const videoTransform = (slot: Slot) => {
    const c = clips[slot];
    return { transform: [{ scale: c.zoom }, { translateX: c.px }, { translateY: c.py }] };
  };

  return (
    <View style={styles.stage}>
      {(["L", "R"] as Slot[]).map((slot) => (
        <View
          key={slot}
          style={[
            styles.pane,
            paneStyle(slot),
            showSelection && sel === slot ? styles.paneSelected : null,
          ]}
          // A zoomed VideoView is a hardware-accelerated surface that can
          // paint outside a plain overflow:hidden clip on Android — forcing
          // this pane onto its own offscreen texture makes the OS composite
          // (and clip) it as one flattened layer instead.
          renderToHardwareTextureAndroid
        >
          <VideoView
            player={slot === "L" ? playerL : playerR}
            style={[StyleSheet.absoluteFill, videoTransform(slot)]}
            contentFit="contain"
            nativeControls={false}
            // Android's default SurfaceView renders on its own compositor
            // layer and ignores the pane's overflow:hidden clip once zoomed
            // — textureView participates in normal view clipping instead.
            surfaceType="textureView"
          />
          <View style={styles.slotTag}>
            <Text style={styles.slotTagText}>{slot}</Text>
          </View>
        </View>
      ))}

      {side && <View style={styles.divider} />}

      <GestureDetector gesture={stageGesture}>
        <View style={styles.tapLayer} />
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    backgroundColor: "#000",
    overflow: "hidden",
  },
  pane: {
    position: "absolute",
    top: 0,
    bottom: 0,
    overflow: "hidden",
  },
  paneSelected: {
    borderWidth: 2,
    borderColor: color.accent,
  },
  slotTag: {
    position: "absolute",
    left: 8,
    top: 8,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: withAlpha(color.stageBg, 0.65),
  },
  slotTagText: {
    fontSize: 10,
    letterSpacing: 1,
    color: color.neutral300,
  },
  divider: {
    position: "absolute",
    left: "50%",
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: withAlpha(color.text, 0.22),
    pointerEvents: "none",
  },
  tapLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 3,
  },
});
