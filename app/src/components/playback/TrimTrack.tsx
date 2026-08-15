import { StyleSheet, Text, View, type DimensionValue } from "react-native";
import { color, radius, withAlpha } from "@/theme";

type TrimTrackProps = {
  label: string;
  labelColor: string;
  editable: boolean;
  inFrac: number;
  outFrac: number;
  playheadFrac: number;
  timeText: string;
};

export function TrimTrack({ label, labelColor, editable, inFrac, outFrac, playheadFrac, timeText }: TrimTrackProps) {
  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: labelColor }]} numberOfLines={1}>
        {label}
      </Text>
      <View style={styles.track}>
        <View
          style={[
            styles.window,
            { left: pct(inFrac), width: pct(Math.max(0, outFrac - inFrac)) },
          ]}
        />
        {editable && <View style={[styles.handle, { left: pct(inFrac), marginLeft: -5 }]} />}
        {editable && <View style={[styles.handle, { left: pct(outFrac), marginLeft: -4 }]} />}
        <View style={[styles.playhead, { left: pct(playheadFrac) }]} pointerEvents="none" />
      </View>
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
  },
  time: {
    width: 78,
    textAlign: "right",
    fontSize: 10,
    fontVariant: ["tabular-nums"],
    color: withAlpha(color.text, 0.55),
  },
});
