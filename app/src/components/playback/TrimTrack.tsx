/* eslint-disable react-hooks/refs -- see Stage.tsx */
import { useRef, useState } from "react";
import { StyleSheet, Text, View, type DimensionValue, type LayoutChangeEvent } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
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
};

const HANDLE_HIT_RADIUS = 16;

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
}: TrimTrackProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const kind = useRef<DragKind>("play");

  const onTrackLayout = (e: LayoutChangeEvent) => setTrackWidth(e.nativeEvent.layout.width);

  const applyAt = (x: number) => {
    if (trackWidth <= 0) return;
    const frac = Math.max(0, Math.min(1, x / trackWidth));
    if (kind.current === "in") onSetIn?.(frac);
    else if (kind.current === "out") onSetOut?.(frac);
    else onScrub?.(frac);
  };

  const gesture = Gesture.Pan()
    .minDistance(0)
    .onBegin((e) => {
      if (trackWidth <= 0) {
        kind.current = "play";
      } else if (editable && Math.abs(e.x - inFrac * trackWidth) <= HANDLE_HIT_RADIUS) {
        kind.current = "in";
      } else if (editable && Math.abs(e.x - outFrac * trackWidth) <= HANDLE_HIT_RADIUS) {
        kind.current = "out";
      } else {
        kind.current = "play";
      }
      if (kind.current === "play") onScrubStart?.();
      applyAt(e.x);
    })
    .onChange((e) => applyAt(e.x));

  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: labelColor }]} numberOfLines={1}>
        {label}
      </Text>
      <GestureDetector gesture={gesture}>
        <View style={styles.track} onLayout={onTrackLayout}>
          <View
            style={[
              styles.window,
              { left: pct(inFrac), width: pct(Math.max(0, outFrac - inFrac)) },
            ]}
          />
          {editable && <View style={[styles.handle, { left: pct(inFrac), marginLeft: -5 }]} />}
          {editable && <View style={[styles.handle, { left: pct(outFrac), marginLeft: -4 }]} />}
          <View style={[styles.playhead, { left: pct(playheadFrac) }]} />
        </View>
      </GestureDetector>
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
    top: -3,
    bottom: -3,
    width: 9,
    borderRadius: radius.sm,
    backgroundColor: color.accent,
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
