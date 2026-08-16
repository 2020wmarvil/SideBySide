import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import type { Slot } from "@/data/types";
import type { DisplayMode } from "@/state/PlaybackSessionContext";
import { color, radius, space, withAlpha } from "@/theme";

type HeaderBarProps = {
  nameL: string;
  nameR: string;
  sel: Slot;
  locked: boolean;
  display: DisplayMode;
  onReplace: (slot: Slot) => void;
  onSetDisplay: (mode: DisplayMode) => void;
  onBack: () => void;
  onTries: () => void;
};

export function HeaderBar({
  nameL,
  nameR,
  sel,
  locked,
  display,
  onReplace,
  onSetDisplay,
  onBack,
  onTries,
}: HeaderBarProps) {
  return (
    <View style={styles.bar}>
      <Pressable style={styles.iconButton} onPress={onBack}>
        <Ionicons name="arrow-back" size={16} color={color.text} />
      </Pressable>

      {/* Same badges Stage shows on the video itself while the chrome is
          hidden — shown here instead while it's up, on the side matching
          each clip's slot letter, so the two never compete for a tap. R is
          pinned to the screen's horizontal midpoint (left-aligned on its
          half, same as Stage's own R badge) rather than the far right edge,
          so it sits flush against the divider between the two clips. */}
      <Chip label={nameL} active={!locked && sel === "L"} onPress={() => !locked && onReplace("L")} />
      <View style={styles.chipRightWrap}>
        <Chip label={nameR} active={!locked && sel === "R"} onPress={() => !locked && onReplace("R")} />
      </View>

      <View style={styles.spacer} />

      <View style={styles.segment}>
        <SegmentButton
          label="Side"
          icon={<MaterialCommunityIcons name="view-split-vertical" size={14} color={display === "side" ? color.accent : color.text} />}
          active={display === "side"}
          onPress={() => onSetDisplay("side")}
        />
        <SegmentButton
          label="Overlay"
          icon={<Ionicons name="layers-outline" size={14} color={display === "overlay" ? color.accent : color.text} />}
          active={display === "overlay"}
          onPress={() => onSetDisplay("overlay")}
          borderLeft
        />
      </View>

      <Pressable style={styles.triesButton} onPress={onTries}>
        <Ionicons name="time-outline" size={14} color={color.text} />
        <Text style={styles.triesText}>Tries</Text>
      </Pressable>
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

function SegmentButton({
  label,
  icon,
  active,
  onPress,
  borderLeft,
}: {
  label: string;
  icon: ReactNode;
  active: boolean;
  onPress: () => void;
  borderLeft?: boolean;
}) {
  return (
    <Pressable
      style={[styles.segmentButton, borderLeft && styles.segmentButtonBorder]}
      onPress={onPress}
    >
      {icon}
      <Text style={[styles.segmentText, active && { color: color.accent }]}>{label}</Text>
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
  chipRightWrap: {
    position: "absolute",
    left: "50%",
    top: 0,
    bottom: 0,
    marginLeft: 16,
    justifyContent: "center",
  },
  chipNeutral: { backgroundColor: color.neutral800 },
  chipActive: { borderWidth: 1, borderColor: color.accent, backgroundColor: "transparent" },
  chipText: { fontSize: 11, color: color.neutral100 },
  spacer: { flex: 1 },
  segment: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: withAlpha(color.text, 0.22),
    borderRadius: radius.md,
    overflow: "hidden",
  },
  segmentButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  segmentButtonBorder: {
    borderLeftWidth: 1,
    borderLeftColor: withAlpha(color.text, 0.22),
  },
  segmentText: { fontSize: 12, color: color.text },
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
