import { Pressable, StyleSheet, Text, View } from "react-native";
import Slider from "@react-native-community/slider";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { TrimTrack } from "./TrimTrack";
import { color, radius, space, withAlpha } from "@/theme";

export type TrackRow = {
  key: string;
  label: string;
  labelColor: string;
  editable: boolean;
  inFrac: number;
  outFrac: number;
  playheadFrac: number;
  timeText: string;
  onSetIn: (frac: number) => void;
  onSetOut: (frac: number) => void;
  onScrub: (frac: number) => void;
  onScrubStart: () => void;
  onScrubEnd: () => void;
};

type TransportBarProps = {
  tracks: TrackRow[];
  playing: boolean;
  speed: number;
  speedText: string;
  zoom: number;
  overlayMode: boolean;
  opacity: number;
  opacityText: string;
  locked: boolean;
  replaceLabel: string;
  controlsEnabled: boolean;
  onPlay: () => void;
  onStep: (n: number) => void;
  onSpeedChange: (n: number) => void;
  onZoomChange: (n: number) => void;
  onOpacityChange: (n: number) => void;
  onSwap: () => void;
  onReplace: () => void;
  onLock: () => void;
};

export function TransportBar({
  tracks,
  playing,
  speed,
  speedText,
  zoom,
  overlayMode,
  opacity,
  opacityText,
  locked,
  replaceLabel,
  controlsEnabled,
  onPlay,
  onStep,
  onSpeedChange,
  onZoomChange,
  onOpacityChange,
  onSwap,
  onReplace,
  onLock,
}: TransportBarProps) {
  return (
    <View style={styles.bar}>
      {tracks.map((t) => (
        <TrimTrack
          key={t.key}
          label={t.label}
          labelColor={t.labelColor}
          editable={t.editable}
          inFrac={t.inFrac}
          outFrac={t.outFrac}
          playheadFrac={t.playheadFrac}
          timeText={t.timeText}
          onSetIn={t.onSetIn}
          onSetOut={t.onSetOut}
          onScrub={t.onScrub}
          onScrubStart={t.onScrubStart}
          onScrubEnd={t.onScrubEnd}
        />
      ))}

      <View style={styles.controlsRow}>
        <Pressable style={styles.playButton} onPress={onPlay} disabled={!controlsEnabled}>
          <Ionicons name={playing ? "pause" : "play"} size={16} color={color.accent} />
        </Pressable>

        <View style={styles.stepGroup}>
          {[-5, -1, 1, 5].map((n) => (
            <Pressable key={n} style={styles.stepButton} onPress={() => onStep(n)} disabled={!controlsEnabled}>
              <Text style={styles.stepText}>{n > 0 ? `+${n}` : n}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.sliderGroup}>
          <Ionicons name="speedometer-outline" size={14} color={color.neutral400} />
          <Slider
            style={styles.slider}
            minimumValue={0.1}
            maximumValue={1}
            step={0.05}
            value={speed}
            onValueChange={onSpeedChange}
            disabled={!controlsEnabled}
            minimumTrackTintColor={color.accent}
            maximumTrackTintColor={withAlpha(color.text, 0.2)}
          />
          <Text style={styles.sliderValue}>{speedText}</Text>
        </View>

        <View style={styles.sliderGroup}>
          <MaterialCommunityIcons name="magnify-plus-outline" size={14} color={color.neutral400} />
          <Slider
            style={styles.sliderSmall}
            minimumValue={1}
            maximumValue={3}
            step={0.05}
            value={zoom}
            onValueChange={onZoomChange}
            disabled={!controlsEnabled}
            minimumTrackTintColor={color.accent}
            maximumTrackTintColor={withAlpha(color.text, 0.2)}
          />
        </View>

        {overlayMode && (
          <View style={styles.sliderGroup}>
            <Ionicons name="contrast-outline" size={14} color={color.neutral400} />
            <Slider
              style={styles.sliderSmall}
              minimumValue={0}
              maximumValue={1}
              step={0.02}
              value={opacity}
              onValueChange={onOpacityChange}
              disabled={!controlsEnabled}
              minimumTrackTintColor={color.accent}
              maximumTrackTintColor={withAlpha(color.text, 0.2)}
            />
            <Text style={styles.sliderValue}>{opacityText}</Text>
            <Pressable style={styles.smallButton} onPress={onSwap}>
              <Ionicons name="swap-horizontal-outline" size={14} color={color.text} />
              <Text style={styles.smallButtonText}>Swap</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.trailingGroup}>
          <Pressable style={styles.smallButton} onPress={onReplace}>
            <Ionicons name="ellipse" size={12} color={color.text} />
            <Text style={styles.smallButtonText}>{replaceLabel}</Text>
          </Pressable>
          <Pressable style={[styles.lockButton, locked && styles.lockButtonActive]} onPress={onLock}>
            <Ionicons name={locked ? "lock-closed" : "lock-open-outline"} size={14} color={locked ? color.stageBg : color.text} />
            <Text style={[styles.lockText, locked && { color: color.stageBg }]}>{locked ? "Locked" : "Lock timeline"}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 6,
    paddingHorizontal: space[4],
    paddingTop: 14,
    paddingBottom: 12,
    gap: 9,
    backgroundColor: withAlpha(color.stageBg, 0.94),
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
    flexWrap: "wrap",
  },
  playButton: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  stepGroup: { flexDirection: "row", gap: 3 },
  stepButton: {
    borderWidth: 1,
    borderColor: withAlpha(color.text, 0.2),
    borderRadius: radius.md,
    paddingHorizontal: 7,
    paddingVertical: 5,
  },
  stepText: { fontSize: 11, color: color.text },
  sliderGroup: { flexDirection: "row", alignItems: "center", gap: 6 },
  slider: { width: 78, height: 24 },
  sliderSmall: { width: 64, height: 24 },
  sliderValue: {
    width: 32,
    fontSize: 11,
    fontVariant: ["tabular-nums"],
    color: color.neutral300,
  },
  smallButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: withAlpha(color.text, 0.2),
    borderRadius: radius.md,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  smallButtonText: { fontSize: 11, color: color.text },
  trailingGroup: { marginLeft: "auto", flexDirection: "row", alignItems: "center", gap: 6 },
  lockButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: withAlpha(color.text, 0.2),
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  lockButtonActive: { backgroundColor: color.accent, borderColor: color.accent },
  lockText: { fontSize: 12, color: color.text },
});
