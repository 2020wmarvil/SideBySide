/* eslint-disable react-hooks/refs -- see Stage.tsx */
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View, type DimensionValue, type LayoutChangeEvent } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { color, radius, withAlpha } from "@/theme";

type DragKind = "in" | "out" | "play";

type TrimTrackProps = {
  label: string;
  labelColor: string;
  editable: boolean;
  inFrac: number;
  outFrac: number;
  playheadFrac: number;
  timeText: string;
  onSetIn?: (frac: number) => void;
  onSetOut?: (frac: number) => void;
  onScrub?: (frac: number) => void;
  onScrubStart?: () => void;
  onScrubEnd?: () => void;
};

const HANDLE_HIT_RADIUS = 24;

export function TrimTrack({
  label,
  labelColor,
  editable,
  inFrac,
  outFrac,
  playheadFrac,
  timeText,
  onSetIn,
  onSetOut,
  onScrub,
  onScrubStart,
  onScrubEnd,
}: TrimTrackProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const kind = useRef<DragKind>("play");
  const isDragging = useRef(false);

  const onTrackLayout = (e: LayoutChangeEvent) => setTrackWidth(e.nativeEvent.layout.width);

  // The playhead position ticks from a 70ms polling interval during
  // playback, which reads as choppy if applied straight to layout — ease
  // between samples instead so it reads as continuous motion. While
  // dragging, or on a loop reset back to the trim-in point (playback only
  // ever moves forward otherwise), skip the ease and snap instantly —
  // easing a loop reset would look like the marker sliding backward across
  // the whole timeline instead of restarting.
  const playheadX = useSharedValue(playheadFrac);
  const prevFrac = useRef(playheadFrac);
  useEffect(() => {
    const jumpedBack = playheadFrac < prevFrac.current - 0.001;
    prevFrac.current = playheadFrac;
    playheadX.value =
      isDragging.current || jumpedBack
        ? playheadFrac
        : withTiming(playheadFrac, { duration: 90, easing: Easing.linear });
  }, [playheadFrac, playheadX]);
  const playheadStyle = useAnimatedStyle(() => ({
    left: `${Math.max(0, Math.min(100, playheadX.value * 100))}%`,
  }));

  const applyAt = (x: number) => {
    if (trackWidth <= 0) return;
    const frac = Math.max(0, Math.min(1, x / trackWidth));
    if (kind.current === "in") onSetIn?.(frac);
    else if (kind.current === "out") onSetOut?.(frac);
    else onScrub?.(frac);
  };

  // Runs on the JS thread (called via runOnJS below) so the write to
  // kind.current here is the same copy applyAt() reads later — a worklet
  // mutating kind.current would only touch its own UI-thread copy of the
  // ref and applyAt would never see it.
  const begin = (k: DragKind, x: number) => {
    kind.current = k;
    isDragging.current = true;
    onScrubStart?.();
    applyAt(x);
  };

  const finalize = () => {
    isDragging.current = false;
    onScrubEnd?.();
  };

  const gesture = Gesture.Pan()
    .minDistance(0)
    .onBegin((e) => {
      let k: DragKind;
      if (trackWidth <= 0) {
        k = "play";
      } else if (editable && Math.abs(e.x - inFrac * trackWidth) <= HANDLE_HIT_RADIUS) {
        k = "in";
      } else if (editable && Math.abs(e.x - outFrac * trackWidth) <= HANDLE_HIT_RADIUS) {
        k = "out";
      } else {
        k = "play";
      }
      // onBegin/onChange/onFinalize run as UI-thread worklets (auto-workletized
      // by the gesture builder methods) — the prop callbacks below are plain JS
      // closures, so they must cross back via runOnJS or they throw.
      runOnJS(begin)(k, e.x);
    })
    .onChange((e) => runOnJS(applyAt)(e.x))
    .onFinalize(() => runOnJS(finalize)());

  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: labelColor }]} numberOfLines={1}>
        {label}
      </Text>
      {editable && (
        <Pressable
          style={styles.snapButton}
          onPress={() => onSetIn?.(playheadFrac)}
          hitSlop={8}
          accessibilityLabel="Snap start to playhead"
        >
          <Text style={styles.snapButtonText}>{">"}</Text>
        </Pressable>
      )}
      <GestureDetector gesture={gesture}>
        <View style={styles.track} onLayout={onTrackLayout}>
          <View
            style={[
              styles.window,
              { left: pct(inFrac), width: pct(Math.max(0, outFrac - inFrac)) },
            ]}
          />
          {editable && <View style={[styles.handle, { left: pct(inFrac), marginLeft: -7 }]} />}
          {editable && <View style={[styles.handle, { left: pct(outFrac), marginLeft: -7 }]} />}
          <Animated.View style={[styles.playhead, playheadStyle]} />
        </View>
      </GestureDetector>
      {editable && (
        <Pressable
          style={styles.snapButton}
          onPress={() => onSetOut?.(playheadFrac)}
          hitSlop={8}
          accessibilityLabel="Snap end to playhead"
        >
          <Text style={styles.snapButtonText}>{"<"}</Text>
        </Pressable>
      )}
      <Text style={styles.time} numberOfLines={1}>
        {timeText}
      </Text>
    </View>
  );
}

function pct(frac: number): DimensionValue {
  return `${Math.max(0, Math.min(100, frac * 100)).toFixed(2)}%` as DimensionValue;
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 9 },
  label: {
    width: 70,
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  track: {
    position: "relative",
    flex: 1,
    height: 24,
    borderRadius: 5,
    backgroundColor: withAlpha(color.text, 0.09),
  },
  window: {
    position: "absolute",
    top: 0,
    bottom: 0,
    backgroundColor: withAlpha(color.accent, 0.22),
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: color.accent,
  },
  handle: {
    position: "absolute",
    top: -4,
    bottom: -4,
    width: 14,
    borderRadius: radius.sm,
    backgroundColor: color.accent,
  },
  snapButton: {
    width: 28,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: withAlpha(color.accent, 0.5),
  },
  snapButtonText: {
    fontSize: 18,
    lineHeight: 20,
    fontWeight: "700",
    color: color.accent,
  },
  playhead: {
    position: "absolute",
    top: -4,
    bottom: -4,
    width: 2,
    marginLeft: -1,
    backgroundColor: color.neutral100,
    pointerEvents: "none",
  },
  time: {
    width: 78,
    textAlign: "right",
    fontSize: 10,
    fontVariant: ["tabular-nums"],
    color: withAlpha(color.text, 0.55),
  },
});
