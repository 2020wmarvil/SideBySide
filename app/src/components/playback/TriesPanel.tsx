import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Clip } from "@/data/types";
import { useThumbnail } from "@/hooks/useThumbnail";
import { formatDate, formatDuration } from "@/lib/format";
import { color, radius, elevation, withAlpha } from "@/theme";

type TriesPanelProps = {
  activeClip: Clip | null;
  tries: Clip[];
  targetLabel: string;
  onSelect: (clip: Clip) => void;
  onClose: () => void;
};

/** Quick-switch popover for prior attempts sharing a tag with the active
 * slot's clip — port of the prototype's static tries list, but driven by
 * the real library instead of four hardcoded rows. */
export function TriesPanel({ activeClip, tries, targetLabel, onSelect, onClose }: TriesPanelProps) {
  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <Text style={styles.headerText} numberOfLines={1}>
          {activeClip ? activeClip.tags.join(" · ") || activeClip.title : "Tries"}
        </Text>
        <Pressable style={styles.closeButton} onPress={onClose}>
          <Ionicons name="close" size={13} color={color.text} />
        </Pressable>
      </View>

      {tries.length === 0 ? (
        <Text style={styles.emptyText}>No other tries tagged like this yet.</Text>
      ) : (
        <View style={styles.list}>
          {tries.map((clip, i) => (
            <TryRow key={clip.id} clip={clip} isLatest={i === 0} onPress={() => onSelect(clip)} />
          ))}
        </View>
      )}

      <Text style={styles.hint}>Loads into the {targetLabel}, keeping its pan &amp; zoom.</Text>
    </View>
  );
}

function TryRow({ clip, isLatest, onPress }: { clip: Clip; isLatest: boolean; onPress: () => void }) {
  const thumb = useThumbnail(clip.uri);
  const duration = formatDuration(clip.durationSec);

  return (
    <Pressable style={styles.row} onPress={onPress}>
      {thumb ? (
        <Image source={{ uri: thumb }} style={styles.thumb} resizeMode="cover" />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]}>
          <Ionicons name="film-outline" size={14} color={color.neutral600} />
        </View>
      )}
      <Text style={styles.date} numberOfLines={1}>
        {formatDate(clip.createdAt)}
      </Text>
      <View style={[styles.badge, isLatest && styles.badgeLatest]}>
        <Text style={[styles.badgeText, isLatest && styles.badgeTextLatest]}>
          {isLatest ? "latest" : (duration ?? "")}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: "absolute",
    right: 12,
    top: 54,
    zIndex: 7,
    width: 246,
    padding: 10,
    borderRadius: radius.lg,
    backgroundColor: color.surface,
    elevation: elevation.lg,
    boxShadow: "0px 16px 40px rgba(0, 0, 0, 0.65)",
  },
  header: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  headerText: { flex: 1, fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase", color: color.textMuted },
  closeButton: { padding: 2 },
  emptyText: { fontSize: 11, color: color.textMuted, paddingVertical: 6 },
  list: { gap: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 8, padding: 6, borderRadius: radius.sm },
  thumb: { width: 44, height: 26, borderRadius: 3 },
  thumbPlaceholder: { backgroundColor: color.neutral900, alignItems: "center", justifyContent: "center" },
  date: { flex: 1, fontSize: 12, color: color.text },
  badge: { borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 1, backgroundColor: color.neutral800 },
  badgeLatest: { backgroundColor: color.accent800 },
  badgeText: { fontSize: 9, color: color.neutral100 },
  badgeTextLatest: { color: color.accent100 },
  hint: { marginTop: 6, fontSize: 10, color: withAlpha(color.text, 0.45) },
});
