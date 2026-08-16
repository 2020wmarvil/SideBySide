import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
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
  chrome: boolean;
  topInset: number;
  onTapStage: () => void;
  onPanEnd: (slot: Slot, px: number, py: number) => void;
  onPinchEnd: (slot: Slot, zoom: number) => void;
  onSelectSlot: (slot: Slot) => void;
  onReplace: (slot: Slot) => void;
};

const clampPx = (v: number) => {
  "worklet";
  return Math.max(-60, Math.min(60, v));
};
const clampZoom = (v: number) => {
  "worklet";
  return Math.max(1, Math.min(3, v));
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
  chrome,
  topInset,
  onTapStage,
  onPanEnd,
  onPinchEnd,
  onSelectSlot,
  onReplace,
}: StageProps) {
  const [stageWidth, setStageWidth] = useState(0);
  const side = display === "side";

  // Live framing lives on the UI thread, not in React state — a drag/pinch
  // fires onChange dozens of times a second, and routing each of those
  // through runOnJS into session state re-rendered the whole playback
  // screen (context consumers, both VideoViews, chrome) on every touch-move,
  // which is what made panning/zooming feel laggy. These shared values are
  // the actual source of truth while a gesture is active; session.clips is
  // only resynced once, when the gesture ends, purely for persistence (trim
  // track, pinch-base-on-next-gesture, etc).
  const framing = {
    L: {
      px: useSharedValue(clips.L.px),
      py: useSharedValue(clips.L.py),
      zoom: useSharedValue(clips.L.zoom),
    },
    R: {
      px: useSharedValue(clips.R.px),
      py: useSharedValue(clips.R.py),
      zoom: useSharedValue(clips.R.zoom),
    },
  };

  // Resync from session state whenever it changes for a reason other than
  // our own gesture-end commit below (a fresh clip load, or a keepFraming
  // reset) — harmless no-op when it *is* our own commit, since the shared
  // value already holds that exact number.
  useEffect(() => {
    framing.L.px.value = clips.L.px;
    framing.L.py.value = clips.L.py;
    framing.L.zoom.value = clips.L.zoom;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clips.L.px, clips.L.py, clips.L.zoom]);
  useEffect(() => {
    framing.R.px.value = clips.R.px;
    framing.R.py.value = clips.R.py;
    framing.R.zoom.value = clips.R.zoom;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clips.R.px, clips.R.py, clips.R.zoom]);

  // Pan/pinch target whichever clip is physically under the touch, not
  // whichever slot is "selected" for transport controls — framing a clip
  // should feel like touching it, independent of which one is wired up to
  // the trim/scrub controls below. In side-by-side that's a left/right
  // split by touch x, resolved through `top` since swapping is a pure
  // position change and doesn't move clip identity; in overlay only the
  // top pane is visible to touch, so it's always the target. The slot is
  // resolved once per gesture (onBegin) and held in a UI-thread shared
  // value so a finger drifting across the midline mid-drag doesn't
  // retarget partway through.
  const slotAt = (x: number): Slot => {
    "worklet";
    if (!side) return top;
    if (stageWidth <= 0) return top;
    const other: Slot = top === "L" ? "R" : "L";
    return x < stageWidth / 2 ? top : other;
  };

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
    .onEnd((e, success) => {
      if (!success) return;
      runOnJS(onTapStage)();
      // Only side-by-side mode has a meaningful left/right split to select
      // from — overlay mode's panes are both full-width and stacked.
      if (side && stageWidth > 0) {
        runOnJS(onSelectSlot)(slotAt(e.x));
      }
    });

  const panSlot = useSharedValue<Slot>("L");
  const pinchSlot = useSharedValue<Slot>("L");
  // Captured once in onBegin (see usePlaybackEngine-style comment below):
  // pinch's `scale` is cumulative since the gesture began, so the zoom the
  // touched slot had at that moment is the fixed base every onChange
  // multiplies from — not the previous event's zoom, which would compound
  // the scale factor every frame.
  const pinchBaseZoom = useSharedValue(1);

  const panGesture = Gesture.Pan()
    .enabled(!locked)
    .onBegin((e) => {
      panSlot.value = slotAt(e.x);
    })
    .onChange((e) => {
      const f = framing[panSlot.value];
      f.px.value = clampPx(f.px.value + e.changeX);
      f.py.value = clampPx(f.py.value + e.changeY);
    })
    .onEnd(() => {
      const s = panSlot.value;
      runOnJS(onPanEnd)(s, framing[s].px.value, framing[s].py.value);
    });

  const pinchGesture = Gesture.Pinch()
    .enabled(!locked)
    .onBegin((e) => {
      pinchSlot.value = slotAt(e.focalX);
      pinchBaseZoom.value = framing[pinchSlot.value].zoom.value;
    })
    .onChange((e) => {
      framing[pinchSlot.value].zoom.value = clampZoom(pinchBaseZoom.value * e.scale);
    })
    .onEnd(() => {
      const s = pinchSlot.value;
      runOnJS(onPinchEnd)(s, framing[s].zoom.value);
    });

  const stageGesture = Gesture.Race(tapGesture, Gesture.Simultaneous(panGesture, pinchGesture));

  const showSelection = side && !locked;

  const paneStyle = (slot: Slot) => {
    const isTop = top === slot;
    if (side) {
      return {
        left: isTop ? "0%" : "50%",
        width: "50%",
        zIndex: 1,
        opacity: 1,
      } as const;
    }
    return {
      left: "0%",
      width: "100%",
      zIndex: isTop ? 2 : 1,
      opacity: isTop ? opacity : 1,
    } as const;
  };

  // Mirror first, while still in the video's own local space — flipping
  // after translate/pan would mirror the pan offset too, reversing which
  // way a drag moves the frame once a clip is mirrored. Driven by the
  // shared values above (not clips[slot] directly) so a drag/pinch updates
  // the pane on the UI thread with zero JS re-renders in the loop.
  const styleL = useAnimatedStyle(() => ({
    transform: [
      { scaleX: clips.L.mirrored ? -1 : 1 },
      { scale: framing.L.zoom.value },
      { translateX: framing.L.px.value },
      { translateY: framing.L.py.value },
    ],
  }));
  const styleR = useAnimatedStyle(() => ({
    transform: [
      { scaleX: clips.R.mirrored ? -1 : 1 },
      { scale: framing.R.zoom.value },
      { translateX: framing.R.px.value },
      { translateY: framing.R.py.value },
    ],
  }));
  const videoStyle = (slot: Slot) => (slot === "L" ? styleL : styleR);

  const onStageLayout = (e: LayoutChangeEvent) => setStageWidth(e.nativeEvent.layout.width);

  return (
    <View style={styles.stage} onLayout={onStageLayout}>
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
          <Animated.View style={[StyleSheet.absoluteFill, videoStyle(slot)]}>
            <VideoView
              player={slot === "L" ? playerL : playerR}
              style={StyleSheet.absoluteFill}
              contentFit="contain"
              nativeControls={false}
              // Android's default SurfaceView renders on its own compositor
              // layer and ignores the pane's overflow:hidden clip once
              // zoomed — textureView participates in normal view clipping
              // instead.
              surfaceType="textureView"
            />
          </Animated.View>
        </View>
      ))}

      {side && <View style={styles.divider} />}

      <GestureDetector gesture={stageGesture}>
        <View style={styles.tapLayer} />
      </GestureDetector>

      {/* Rendered above tapLayer (which sits at a higher zIndex than the
          panes) so these can actually receive taps instead of the stage's
          own tap/pan/pinch gesture swallowing them first. Tapping the name
          replaces that clip; selecting which slot is active happens by
          tapping either half of the video instead (see tapGesture above).
          Only shown while the chrome is hidden — HeaderBar shows its own
          equivalent badges when the chrome is up, so the two never compete
          for the same tap. */}
      {!chrome &&
        (["L", "R"] as Slot[]).map((slot, i) => (
          <Pressable
            key={slot}
            style={[
              styles.slotTag,
              { top: topInset + 8 + (side ? 0 : i * 26) },
              side ? (slot === top ? { left: 8 } : { left: "50%", marginLeft: 8 }) : { left: 8 },
              !locked && sel === slot && styles.slotTagActive,
            ]}
            onPress={() => !locked && onReplace(slot)}
          >
            <Text style={styles.slotTagText} numberOfLines={1}>
              {clips[slot].title || "none"}
            </Text>
          </Pressable>
        ))}
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
    maxWidth: 150,
    zIndex: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "transparent",
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: withAlpha(color.stageBg, 0.65),
  },
  slotTagActive: { borderColor: color.accent },
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
