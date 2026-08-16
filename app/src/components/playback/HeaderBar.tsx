import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import type { Slot } from "@/data/types";
import { color, radius, space, withAlpha } from "@/theme";

// Tries history is built but paused until further notice — flip this back
// on to restore the header button without touching any other wiring.
const TRIES_HISTORY_ENABLED = false;

type HeaderBarProps = {
  nameL: string;
  nameR: string;
  mirroredL: boolean;
  mirroredR: boolean;
  top: Slot;
  sel: Slot;
  locked: boolean;
  onReplace: (slot: Slot) => void;
  onMirror: (slot: Slot) => void;
  onBack: () => void;
  onTries: () => void;
};

export function HeaderBar({
  nameL,
  nameR,
  mirroredL,
  mirroredR,
  top,
  sel,
  locked,
  onReplace,
  onMirror,
  onBack,
  onTries,
}: HeaderBarProps) {
  // Which slot renders on which side follows `top`, same as Stage's own
  // panes — swapping is a pure position change, not a content move.
  const leftSlot = top;
  const rightSlot: Slot = top === "L" ? "R" : "L";
  // Empty slots have no title — show "none" rather than a blank chip.
  const nameFor = (slot: Slot) => (slot === "L" ? nameL : nameR) || "none";
  const mirroredFor = (slot: Slot) => (slot === "L" ? mirroredL : mirroredR);

  return (
    <View style={styles.bar}>
      <Pressable style={styles.iconButton} onPress={onBack}>
        <Ionicons name="arrow-back" size={16} color={color.text} />
      </Pressable>

      {/* Same badges Stage shows on the video itself while the chrome is
          hidden — shown here instead while it's up, on the side matching
          each clip's current on-screen position, so the two never compete
          for a tap. The right-hand badge is pinned to the screen's
          horizontal midpoint (left-aligned on its half, same as Stage's own
          right-hand badge) rather than the far right edge, so it sits flush
          against the divider between the two clips. */}
      <View style={styles.chipGroup}>
        <Chip
          label={nameFor(leftSlot)}
          active={!locked && sel === leftSlot}
          onPress={() => !locked && onReplace(leftSlot)}
        />
        <MirrorButton active={mirroredFor(leftSlot)} onPress={() => onMirror(leftSlot)} />
      </View>
      <View style={styles.chipRightWrap}>
        <Chip
          label={nameFor(rightSlot)}
          active={!locked && sel === rightSlot}
          onPress={() => !locked && onReplace(rightSlot)}
        />
        <MirrorButton active={mirroredFor(rightSlot)} onPress={() => onMirror(rightSlot)} />
      </View>

      <View style={styles.spacer} />

      {TRIES_HISTORY_ENABLED && (
        <Pressable style={styles.triesButton} onPress={onTries}>
          <Ionicons name="time-outline" size={14} color={color.text} />
          <Text style={styles.triesText}>Tries</Text>
        </Pressable>
      )}
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.chip, active ? styles.chipActive : styles.chipNeutral]} onPress={onPress}>
      <Text style={[styles.chipText, active && { color: color.accent }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function MirrorButton({ active, onPress }: { active: boolean; onPress: () => void }) {
  return (
    <Pressable
      style={[styles.mirrorButton, active && styles.mirrorButtonActive]}
      onPress={onPress}
      hitSlop={6}
    >
      <MaterialCommunityIcons name="flip-horizontal" size={14} color={active ? color.accent : color.neutral300} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    zIndex: 6,
    paddingHorizontal: space[4],
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
    backgroundColor: withAlpha(color.stageBg, 0.6),
  },
  iconButton: {
    width: 30,
    height: 30,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: withAlpha(color.text, 0.22),
    alignItems: "center",
    justifyContent: "center",
  },
  chip: {
    maxWidth: 130,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  chipGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  chipRightWrap: {
    position: "absolute",
    left: "50%",
    top: 0,
    bottom: 0,
    marginLeft: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    justifyContent: "center",
  },
  chipNeutral: { backgroundColor: color.neutral800 },
  chipActive: { borderWidth: 1, borderColor: color.accent, backgroundColor: "transparent" },
  chipText: { fontSize: 11, color: color.neutral100 },
  mirrorButton: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.neutral800,
  },
  mirrorButtonActive: { borderWidth: 1, borderColor: color.accent, backgroundColor: "transparent" },
  spacer: { flex: 1 },
  triesButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: withAlpha(color.text, 0.22),
    borderRadius: radius.md,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  triesText: { fontSize: 12, color: color.text },
});
