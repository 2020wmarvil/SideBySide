import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useClipLibrary } from "@/data/ClipLibraryContext";
import { allTags, filterClips } from "@/data/clipRepository";
import { usePlaybackSession } from "@/state/PlaybackSessionContext";
import { ClipCard } from "@/components/library/ClipCard";
import { SelectionToolbar } from "@/components/library/SelectionToolbar";
import { TagChip } from "@/components/library/TagChip";
import { TagEditor } from "@/components/shared/TagEditor";
import { slotName } from "@/lib/format";
import type { Clip, Slot } from "@/data/types";
import { color, radius, space, withAlpha } from "@/theme";

// Below this width (portrait phones) the persistent sidebar doesn't fit —
// filters collapse to a stack of full-width rows above the grid instead.
const WIDE_LAYOUT_MIN_WIDTH = 500;

export default function LibraryScreen() {
  const { slot: replaceSlot } = useLocalSearchParams<{ slot?: Slot }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { clips, loading, removeClip, updateClip } = useClipLibrary();
  const session = usePlaybackSession();

  const [search, setSearch] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [pickId, setPickId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameText, setRenameText] = useState("");
  const [editingTags, setEditingTags] = useState(false);

  const isWide = width >= WIDE_LAYOUT_MIN_WIDTH;
  const hasClips = clips.length > 0;
  const visible = filterClips(clips, search, tags);
  const tagList = allTags(clips);
  const libTitle = tags.length ? tags.join(" + ") : "All clips";
  const pickedClip = clips.find((c) => c.id === pickId) ?? null;
  const selectionMode = selectedIds.size > 0;
  const selectedClips = clips.filter((c) => selectedIds.has(c.id));
  const commonTags = selectedClips.length
    ? selectedClips[0].tags.filter((t) => selectedClips.every((c) => c.tags.includes(t)))
    : [];

  const toggleTag = (t: string) =>
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const handleLoad = (slot: Slot, clip?: Clip) => {
    const target = clip ?? pickedClip;
    if (!target) return;
    session.loadClip(slot, target);
    session.setSel(slot);
    if (session.locked) session.toggleLock();
    setPickId(null);
    router.push("/playback");
  };

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const clearSelection = () => setSelectedIds(new Set());

  const handleCardPress = (clip: Clip) => {
    if (replaceSlot) {
      handleLoad(replaceSlot, clip);
      return;
    }
    if (selectionMode) toggleSelect(clip.id);
    else setPickId(clip.id);
  };

  const handleDeleteSelected = async () => {
    for (const id of selectedIds) await removeClip(id);
    clearSelection();
    setConfirmingDelete(false);
  };

  const openRename = () => {
    if (selectedClips.length !== 1) return;
    setRenameText(selectedClips[0].title);
    setRenaming(true);
  };

  const saveRename = async () => {
    if (selectedClips.length !== 1) return;
    const t = renameText.trim();
    if (t) await updateClip(selectedClips[0].id, { title: t });
    setRenaming(false);
  };

  const applyTagChange = (next: string[]) => {
    const added = next.filter((t) => !commonTags.includes(t));
    const removed = commonTags.filter((t) => !next.includes(t));
    for (const c of selectedClips) {
      let nextTags = c.tags;
      for (const t of added) if (!nextTags.includes(t)) nextTags = [...nextTags, t];
      for (const t of removed) nextTags = nextTags.filter((x) => x !== t);
      if (nextTags !== c.tags) updateClip(c.id, { tags: nextTags });
    }
  };

  if (loading) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <ActivityIndicator color={color.accent} />
      </View>
    );
  }

  const tagChips = tagList.map((t) => (
    <TagChip key={t} label={t} active={tags.includes(t)} onPress={() => toggleTag(t)} />
  ));

  const goToImport = () =>
    router.push(replaceSlot ? { pathname: "/import", params: { slot: replaceSlot } } : "/import");

  const replaceHint = replaceSlot ? `Pick a replacement for ${slotName(replaceSlot, session.top)}` : null;

  const grid = !hasClips ? (
    <EmptyState onImport={goToImport} />
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
      renderItem={({ item }) => (
        <ClipCard
          clip={item}
          onPress={() => handleCardPress(item)}
          onLongPress={() => !replaceSlot && toggleSelect(item.id)}
          selected={selectedIds.has(item.id)}
          selectionMode={selectionMode}
        />
      )}
    />
  );

  const toolbar = (
    <SelectionToolbar
      count={selectedIds.size}
      onCancel={clearSelection}
      onRename={selectedIds.size === 1 ? openRename : undefined}
      onEditTags={() => setEditingTags(true)}
      onDelete={() => setConfirmingDelete(true)}
    />
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top }, isWide && styles.screenWide]}>
      {isWide ? (
        <>
          <View style={styles.sidebar}>
            <View style={styles.brand}>
              <Ionicons name="disc-outline" size={16} color={color.accent} />
              <Text style={styles.brandText}>Side By Side</Text>
            </View>

            {hasClips && (
              <TextInput
                style={styles.search}
                placeholder="Search tags"
                placeholderTextColor={color.textFaint}
                value={search}
                onChangeText={setSearch}
                autoComplete="off"
                autoCorrect={false}
                spellCheck={false}
                importantForAutofill="no"
              />
            )}

            {hasClips && <Text style={styles.tagsLabel}>Tags</Text>}
            <View style={styles.tagCloud}>{tagChips}</View>

            <Pressable style={styles.importButton} onPress={goToImport}>
              <Ionicons name="add" size={14} color={color.accent} />
              <Text style={styles.importButtonText}>Import clip</Text>
            </Pressable>
          </View>

          <View style={styles.main}>
            {selectionMode ? (
              toolbar
            ) : (
              <View style={styles.mainHeader}>
                <Text style={styles.libTitleText}>{replaceHint ?? libTitle}</Text>
                {!replaceHint && (
                  <Text style={styles.libCount}>
                    {visible.length} clip{visible.length === 1 ? "" : "s"}
                  </Text>
                )}
              </View>
            )}
            {grid}
          </View>
        </>
      ) : (
        <>
          <View style={styles.narrowHeader}>
            <View style={styles.brand}>
              <Ionicons name="disc-outline" size={16} color={color.accent} />
              <Text style={styles.brandText}>Side By Side</Text>
            </View>
            <View style={styles.narrowHeaderActions}>
              <Pressable style={styles.narrowIconButton} onPress={goToImport}>
                <Ionicons name="add" size={16} color={color.accent} />
              </Pressable>
            </View>
          </View>

          {hasClips && (
            <View style={styles.narrowFilters}>
              <TextInput
                style={styles.search}
                placeholder="Search tags"
                placeholderTextColor={color.textFaint}
                value={search}
                onChangeText={setSearch}
                autoComplete="off"
                autoCorrect={false}
                spellCheck={false}
                importantForAutofill="no"
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagRowNarrow}>
                {tagChips}
              </ScrollView>
            </View>
          )}

          {selectionMode ? (
            toolbar
          ) : (
            <View style={styles.narrowMainHeader}>
              <Text style={styles.libTitleText}>{replaceHint ?? libTitle}</Text>
              {!replaceHint && (
                <Text style={styles.libCount}>
                  {visible.length} clip{visible.length === 1 ? "" : "s"}
                </Text>
              )}
            </View>
          )}
          <View style={styles.main}>{grid}</View>
        </>
      )}

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
                <Pressable style={styles.pickButton} onPress={() => handleLoad(session.top)}>
                  <Text style={styles.pickButtonText}>Load left</Text>
                </Pressable>
                <Pressable
                  style={styles.pickButton}
                  onPress={() => handleLoad(session.top === "L" ? "R" : "L")}
                >
                  <Text style={styles.pickButtonText}>Load right</Text>
                </Pressable>
              </View>
            </Pressable>
          )}
        </Pressable>
      </Modal>

      <Modal visible={renaming} transparent animationType="fade" onRequestClose={() => setRenaming(false)}>
        <Pressable style={styles.backdrop} onPress={() => setRenaming(false)}>
          <Pressable style={styles.pickSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.pickTitle}>Rename clip</Text>
            <TextInput
              style={styles.search}
              value={renameText}
              onChangeText={setRenameText}
              autoFocus
              autoCorrect={false}
              spellCheck={false}
              importantForAutofill="no"
              returnKeyType="done"
              onSubmitEditing={saveRename}
            />
            <View style={styles.pickActions}>
              <Pressable style={styles.pickButton} onPress={() => setRenaming(false)}>
                <Text style={styles.pickButtonText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.pickButton} onPress={saveRename}>
                <Text style={styles.pickButtonText}>Save</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={editingTags} transparent animationType="fade" onRequestClose={() => setEditingTags(false)}>
        <Pressable style={styles.backdrop} onPress={() => setEditingTags(false)}>
          <Pressable style={styles.pickSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.pickTitle}>
              Edit tags · {selectedIds.size} clip{selectedIds.size === 1 ? "" : "s"}
            </Text>
            <TagEditor tags={commonTags} onChange={applyTagChange} allTags={tagList} tagCounts={{}} />
            <Pressable style={styles.pickButton} onPress={() => setEditingTags(false)}>
              <Text style={styles.pickButtonText}>Done</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={confirmingDelete} transparent animationType="fade" onRequestClose={() => setConfirmingDelete(false)}>
        <Pressable style={styles.backdrop} onPress={() => setConfirmingDelete(false)}>
          <Pressable style={styles.pickSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.pickTitle}>
              Delete {selectedIds.size} clip{selectedIds.size === 1 ? "" : "s"}?
            </Text>
            <Text style={styles.pickMeta}>This can&apos;t be undone.</Text>
            <View style={styles.pickActions}>
              <Pressable style={styles.pickButton} onPress={() => setConfirmingDelete(false)}>
                <Text style={styles.pickButtonText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.pickButton, styles.deleteConfirmButton]} onPress={handleDeleteSelected}>
                <Text style={[styles.pickButtonText, styles.deleteConfirmText]}>Delete</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function EmptyState({ onImport }: { onImport: () => void }) {
  return (
    <View style={[styles.centered, { flex: 1, gap: space[3], paddingHorizontal: 40 }]}>
      <Ionicons name="film-outline" size={34} color={color.neutral600} />
      <Text style={styles.emptyTitle}>Nothing in the library yet</Text>
      <Text style={styles.emptyBody}>
        Import a clip from your phone, or record one on the way in. Tag it as you go — that&apos;s how
        you&apos;ll find it later.
      </Text>
      <Pressable style={[styles.emptyButtonPrimary, { marginTop: 2 }]} onPress={onImport}>
        <Ionicons name="folder-open-outline" size={14} color={color.accent} />
        <Text style={styles.emptyButtonPrimaryText}>Import a clip</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  screenWide: { flexDirection: "row" },
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
  narrowHeader: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  narrowHeaderActions: { marginLeft: "auto", flexDirection: "row", gap: 8 },
  narrowIconButton: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.divider,
    alignItems: "center",
    justifyContent: "center",
  },
  narrowFilters: { paddingHorizontal: 14, gap: 8, paddingBottom: 4 },
  tagRowNarrow: { gap: 4, paddingVertical: 2 },
  narrowMainHeader: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 6,
    flexDirection: "row",
    alignItems: "baseline",
    gap: space[3],
  },
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
  deleteConfirmButton: { borderColor: color.danger },
  deleteConfirmText: { color: color.danger },
});
