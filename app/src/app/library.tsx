import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useClipLibrary } from "@/data/ClipLibraryContext";
import { allTags, filterClips } from "@/data/clipRepository";
import { usePlaybackSession } from "@/state/PlaybackSessionContext";
import { ClipCard } from "@/components/library/ClipCard";
import { TagChip } from "@/components/library/TagChip";
import type { Slot } from "@/data/types";
import { color, radius, space, withAlpha } from "@/theme";

export default function LibraryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { clips, loading } = useClipLibrary();
  const session = usePlaybackSession();

  const [search, setSearch] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [pickId, setPickId] = useState<string | null>(null);

  const hasClips = clips.length > 0;
  const visible = filterClips(clips, search, tags);
  const tagList = allTags(clips);
  const libTitle = tags.length ? tags.join(" + ") : "All clips";
  const pickedClip = clips.find((c) => c.id === pickId) ?? null;

  const toggleTag = (t: string) =>
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const handleLoad = (slot: Slot) => {
    if (!pickedClip) return;
    session.loadClip(slot, pickedClip);
    session.setSel(slot);
    if (session.locked) session.toggleLock();
    setPickId(null);
    router.push("/");
  };

  if (loading) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <ActivityIndicator color={color.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.sidebar}>
        <View style={styles.brand}>
          <Ionicons name="disc-outline" size={16} color={color.accent} />
          <Text style={styles.brandText}>Comparer</Text>
        </View>

        {hasClips && (
          <TextInput
            style={styles.search}
            placeholder="Search tags"
            placeholderTextColor={color.textFaint}
            value={search}
            onChangeText={setSearch}
          />
        )}

        {hasClips && <Text style={styles.tagsLabel}>Tags</Text>}

        <View style={styles.tagCloud}>
          {tagList.map((t) => (
            <TagChip key={t} label={t} active={tags.includes(t)} onPress={() => toggleTag(t)} />
          ))}
        </View>

        <Pressable style={styles.importButton} onPress={() => router.push("/import")}>
          <Ionicons name="add" size={14} color={color.accent} />
          <Text style={styles.importButtonText}>Import clip</Text>
        </Pressable>
      </View>

      <View style={styles.main}>
        <View style={styles.mainHeader}>
          <Text style={styles.libTitleText}>{libTitle}</Text>
          <Text style={styles.libCount}>
            {visible.length} clip{visible.length === 1 ? "" : "s"}
          </Text>
          <Pressable style={styles.recordButton} onPress={() => router.push("/record")}>
            <Ionicons name="videocam-outline" size={14} color={color.text} />
            <Text style={styles.recordButtonText}>Record</Text>
          </Pressable>
        </View>

        {!hasClips ? (
          <EmptyState onImport={() => router.push("/import")} onRecord={() => router.push("/record")} />
        ) : visible.length === 0 ? (
          <View style={[styles.centered, { flex: 1 }]}>
            <Text style={styles.noMatchesText}>No clips match this search.</Text>
          </View>
        ) : (
          <FlatList
            data={visible}
            numColumns={3}
            keyExtractor={(c) => c.id}
            columnWrapperStyle={styles.gridRow}
            contentContainerStyle={styles.gridContent}
            renderItem={({ item }) => <ClipCard clip={item} onPress={() => setPickId(item.id)} />}
          />
        )}
      </View>

      <Modal visible={!!pickedClip} transparent animationType="fade" onRequestClose={() => setPickId(null)}>
        <Pressable style={styles.backdrop} onPress={() => setPickId(null)}>
          {pickedClip && (
            <Pressable style={styles.pickSheet} onPress={(e) => e.stopPropagation()}>
              <View>
                <Text style={styles.pickTitle} numberOfLines={2}>
                  {pickedClip.title}
                </Text>
                <Text style={styles.pickMeta} numberOfLines={1}>
                  {pickedClip.tags.join(" · ")}
                </Text>
              </View>
              <View style={styles.pickActions}>
                <Pressable style={styles.pickButton} onPress={() => handleLoad("L")}>
                  <Text style={styles.pickButtonText}>Load left</Text>
                </Pressable>
                <Pressable style={styles.pickButton} onPress={() => handleLoad("R")}>
                  <Text style={styles.pickButtonText}>Load right</Text>
                </Pressable>
              </View>
            </Pressable>
          )}
        </Pressable>
      </Modal>
    </View>
  );
}

function EmptyState({ onImport, onRecord }: { onImport: () => void; onRecord: () => void }) {
  return (
    <View style={[styles.centered, { flex: 1, gap: space[3], paddingHorizontal: 40 }]}>
      <Ionicons name="film-outline" size={34} color={color.neutral600} />
      <Text style={styles.emptyTitle}>Nothing in the library yet</Text>
      <Text style={styles.emptyBody}>
        Import a clip from your phone or record a first attempt. Tag it on the way in — that&apos;s how
        you&apos;ll find it later.
      </Text>
      <View style={{ flexDirection: "row", gap: space[3], marginTop: 2 }}>
        <Pressable style={styles.emptyButtonPrimary} onPress={onImport}>
          <Ionicons name="folder-open-outline" size={14} color={color.accent} />
          <Text style={styles.emptyButtonPrimaryText}>Import from device</Text>
        </Pressable>
        <Pressable style={styles.emptyButtonSecondary} onPress={onRecord}>
          <Ionicons name="videocam-outline" size={14} color={color.text} />
          <Text style={styles.emptyButtonSecondaryText}>Record now</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, flexDirection: "row", backgroundColor: color.bg },
  centered: { alignItems: "center", justifyContent: "center" },
  sidebar: {
    width: 210,
    padding: space[4],
    gap: space[4],
    borderRightWidth: 1,
    borderRightColor: color.divider,
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 6 },
  brandText: { fontWeight: "500", fontSize: 15, color: color.text },
  search: {
    minHeight: 30,
    paddingHorizontal: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.divider,
    backgroundColor: color.surface,
    color: color.text,
    fontSize: 12,
  },
  tagsLabel: { fontSize: 10, letterSpacing: 0.8, textTransform: "uppercase", color: color.textFaint },
  tagCloud: { flexDirection: "row", flexWrap: "wrap", gap: 4, flex: 1 },
  importButton: {
    marginTop: "auto",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: color.accent,
    borderRadius: radius.md,
    paddingVertical: 8,
  },
  importButtonText: { fontSize: 12, color: color.accent },
  main: { flex: 1, minWidth: 0 },
  mainHeader: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "baseline",
    gap: space[3],
  },
  libTitleText: { fontSize: 17, fontWeight: "500", color: color.text },
  libCount: { fontSize: 11, color: color.textFaint },
  recordButton: {
    marginLeft: "auto",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: color.divider,
    borderRadius: radius.md,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  recordButtonText: { fontSize: 12, color: color.text },
  gridContent: { padding: 14, gap: 10 },
  gridRow: { gap: 10 },
  noMatchesText: { fontSize: 12, color: color.textMuted },
  emptyTitle: { fontSize: 17, fontWeight: "500", color: color.text, textAlign: "center" },
  emptyBody: { fontSize: 12, color: color.textMuted, textAlign: "center", maxWidth: 320 },
  emptyButtonPrimary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: color.accent,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  emptyButtonPrimaryText: { fontSize: 12, color: color.accent },
  emptyButtonSecondary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: color.divider,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  emptyButtonSecondaryText: { fontSize: 12, color: color.text },
  backdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: withAlpha(color.stageBg, 0.55),
  },
  pickSheet: {
    width: 300,
    padding: space[4],
    borderRadius: radius.lg,
    backgroundColor: color.surface,
    gap: space[3],
  },
  pickTitle: { fontSize: 14, color: color.text },
  pickMeta: { fontSize: 11, color: color.textFaint, marginTop: 2 },
  pickActions: { flexDirection: "row", gap: 6 },
  pickButton: {
    flex: 1,
    alignItems: "center",
    borderWidth: 1,
    borderColor: color.accent,
    borderRadius: radius.md,
    paddingVertical: 8,
  },
  pickButtonText: { fontSize: 12, color: color.accent },
});
