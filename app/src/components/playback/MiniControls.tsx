import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { color, radius, space, withAlpha } from "@/theme";

type MiniControlsProps = {
  playing: boolean;
  bottom: number;
  onPlay: () => void;
  onStep: (n: number) => void;
};

/** Stays visible while the rest of the chrome (header/transport bar) is
 * hidden, so play/pause and frame-step are always reachable without
 * tapping to bring the full UI back. */
export function MiniControls({ playing, bottom, onPlay, onStep }: MiniControlsProps) {
  return (
    <View style={[styles.row, { bottom }]} pointerEvents="box-none">
      <Pressable style={styles.playButton} onPress={onPlay}>
        <Ionicons name={playing ? "pause" : "play"} size={22} color={color.accent} />
      </Pressable>
      <View style={styles.stepGroup}>
        {[-1, 1].map((n) => (
          <Pressable key={n} style={styles.stepButton} onPress={() => onStep(n)}>
            <Text style={styles.stepText}>{n > 0 ? `+${n}` : n}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    position: "absolute",
    left: space[4],
    zIndex: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
  },
  playButton: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.accent,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: withAlpha(color.stageBg, 0.7),
  },
  stepGroup: { flexDirection: "row", gap: 3 },
  stepButton: {
    borderWidth: 1,
    borderColor: withAlpha(color.text, 0.2),
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: withAlpha(color.stageBg, 0.7),
  },
  stepText: { fontSize: 14, color: color.text },
});
