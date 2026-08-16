import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { TrimTrack } from "./TrimTrack";
import type { DisplayMode } from "@/state/PlaybackSessionContext";
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

const SPEED_OPTIONS = [0.25, 0.5, 0.75, 1] as const;
const OPACITY_OPTIONS = [0, 0.2, 0.4, 0.6, 0.8, 1] as const;

type TransportBarProps = {
  tracks: TrackRow[];
  playing: boolean;
  speed: number;
  display: DisplayMode;
  overlayMode: boolean;
  opacity: number;
  opacityText: string;
  locked: boolean;
  controlsEnabled: boolean;
  onPlay: () => void;
  onStep: (n: number) => void;
  onSpeedChange: (n: number) => void;
  onSetDisplay: (mode: DisplayMode) => void;
  onOpacityChange: (n: number) => void;
  onSwap: () => void;
  onLock: () => void;
};

export function TransportBar({
  tracks,
  playing,
  speed,
  display,
  overlayMode,
  opacity,
  opacityText,
  locked,
  controlsEnabled,
  onPlay,
  onStep,
  onSpeedChange,
  onSetDisplay,
  onOpacityChange,
  onSwap,
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
          <Ionicons name={playing ? "pause" : "play"} size={22} color={color.accent} />
        </Pressable>

        <View style={styles.stepGroup}>
          {[-1, 1].map((n) => (
            <Pressable key={n} style={styles.stepButton} onPress={() => onStep(n)} disabled={!controlsEnabled}>
              <Text style={styles.stepText}>{n > 0 ? `+${n}` : n}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          style={styles.smallButton}
          onPress={() => {
            const idx = SPEED_OPTIONS.indexOf(speed as (typeof SPEED_OPTIONS)[number]);
            onSpeedChange(SPEED_OPTIONS[(idx + 1) % SPEED_OPTIONS.length]);
          }}
          disabled={!controlsEnabled}
        >
          <Ionicons name="speedometer-outline" size={14} color={color.text} />
          <Text style={styles.smallButtonText}>{speed}×</Text>
        </Pressable>

        {/* Overlay has no left/right split to touch-select a clip by, so it
            only makes sense once locked (both clips move together) — the
            whole toggle is moot while unlocked, since side is the only
            valid choice, so it's hidden rather than shown disabled. */}
        {locked && (
          <View style={styles.segment}>
            <Pressable style={styles.segmentButton} onPress={() => onSetDisplay("side")}>
              <MaterialCommunityIcons
                name="view-split-vertical"
                size={14}
                color={display === "side" ? color.accent : color.text}
              />
              <Text style={[styles.smallButtonText, display === "side" && { color: color.accent }]}>Side</Text>
            </Pressable>
            <Pressable
              style={[styles.segmentButton, styles.segmentButtonBorder]}
              onPress={() => onSetDisplay("overlay")}
            >
              <Ionicons name="layers-outline" size={14} color={display === "overlay" ? color.accent : color.text} />
              <Text style={[styles.smallButtonText, display === "overlay" && { color: color.accent }]}>Overlay</Text>
            </Pressable>
          </View>
        )}

        {overlayMode && (
          <Pressable
            style={styles.smallButton}
            onPress={() => {
              const idx = OPACITY_OPTIONS.indexOf(opacity as (typeof OPACITY_OPTIONS)[number]);
              onOpacityChange(OPACITY_OPTIONS[(idx + 1) % OPACITY_OPTIONS.length]);
            }}
            disabled={!controlsEnabled}
          >
            <Ionicons name="contrast-outline" size={14} color={color.text} />
            <Text style={styles.smallButtonText}>{opacityText}</Text>
          </Pressable>
        )}

        <View style={styles.trailingGroup}>
          <Pressable style={styles.lockButton} onPress={onSwap}>
            <Ionicons name="swap-horizontal-outline" size={16} color={color.text} />
          </Pressable>
          <Pressable style={[styles.lockButton, locked && styles.lockButtonActive]} onPress={onLock}>
            <Ionicons name={locked ? "lock-closed" : "lock-open-outline"} size={16} color={locked ? color.stageBg : color.text} />
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
    width: 46,
    height: 46,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  stepGroup: { flexDirection: "row", gap: 3 },
  stepButton: {
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: withAlpha(color.text, 0.2),
    borderRadius: radius.md,
    paddingHorizontal: 12,
  },
  stepText: { fontSize: 14, color: color.text },
  segment: {
    height: 46,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: withAlpha(color.text, 0.2),
    borderRadius: radius.md,
    overflow: "hidden",
  },
  segmentButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 9,
  },
  segmentButtonBorder: {
    borderLeftWidth: 1,
    borderLeftColor: withAlpha(color.text, 0.2),
  },
  smallButton: {
    height: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: withAlpha(color.text, 0.2),
    borderRadius: radius.md,
    paddingHorizontal: 9,
  },
  smallButtonText: { fontSize: 11, color: color.text },
  trailingGroup: { marginLeft: "auto", flexDirection: "row", alignItems: "center", gap: 6 },
  lockButton: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: withAlpha(color.text, 0.2),
    borderRadius: radius.md,
  },
  lockButtonActive: { backgroundColor: color.accent, borderColor: color.accent },
});
