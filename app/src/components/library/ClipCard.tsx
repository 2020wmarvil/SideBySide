import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Clip } from "@/data/types";
import { useThumbnail } from "@/hooks/useThumbnail";
import { formatDate, formatDuration } from "@/lib/format";
import { color, radius, elevation, withAlpha } from "@/theme";

type ClipCardProps = {
  clip: Clip;
  onPress: () => void;
  onLongPress?: () => void;
  selected?: boolean;
  selectionMode?: boolean;
};

export function ClipCard({ clip, onPress, onLongPress, selected, selectionMode }: ClipCardProps) {
  const thumbUri = useThumbnail(clip.uri);
  const duration = formatDuration(clip.durationSec);

  return (
    <Pressable
      style={[styles.card, selected && styles.cardSelected]}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      <View style={styles.thumbWrap}>
        {thumbUri ? (
          <Image source={{ uri: thumbUri }} style={styles.thumb} resizeMode="cover" />
        ) : (
          <View style={[styles.thumb, styles.thumbPlaceholder]}>
            <Ionicons name="film-outline" size={20} color={color.neutral600} />
          </View>
        )}
        {duration && (
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>{duration}</Text>
          </View>
        )}
        {selectionMode && (
          <View style={[styles.selectBadge, selected && styles.selectBadgeOn]}>
            {selected && <Ionicons name="checkmark" size={11} color={color.bg} />}
          </View>
        )}
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {clip.title}
        </Text>
        <View style={styles.tags}>
          {clip.tags.slice(0, 3).map((t) => (
            <View key={t} style={styles.tagPill}>
              <Text style={styles.tagText} numberOfLines={1}>
                {t}
              </Text>
            </View>
          ))}
        </View>
        <Text style={styles.date}>{formatDate(clip.createdAt)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: radius.md,
    backgroundColor: color.surface,
    overflow: "hidden",
    elevation: elevation.sm,
    borderWidth: 2,
    borderColor: "transparent",
  },
  cardSelected: { borderColor: color.accent },
  thumbWrap: { position: "relative" },
  selectBadge: {
    position: "absolute",
    left: 5,
    top: 5,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: color.text,
    backgroundColor: withAlpha(color.stageBg, 0.55),
    alignItems: "center",
    justifyContent: "center",
  },
  selectBadgeOn: { backgroundColor: color.accent, borderColor: color.accent },
  thumb: { width: "100%", height: 74 },
  thumbPlaceholder: {
    backgroundColor: color.neutral900,
    alignItems: "center",
    justifyContent: "center",
  },
  durationBadge: {
    position: "absolute",
    right: 4,
    bottom: 4,
    borderRadius: 3,
    paddingHorizontal: 5,
    paddingVertical: 1,
    backgroundColor: withAlpha(color.stageBg, 0.75),
  },
  durationText: {
    fontSize: 9,
    fontVariant: ["tabular-nums"],
    color: color.text,
  },
  body: { padding: 8, gap: 5 },
  title: { fontSize: 12, lineHeight: 15, color: color.text },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 3 },
  tagPill: {
    borderRadius: 3,
    paddingHorizontal: 6,
    paddingVertical: 1,
    backgroundColor: color.neutral800,
  },
  tagText: { fontSize: 9, color: color.neutral100 },
  date: { fontSize: 10, color: withAlpha(color.text, 0.45) },
});
