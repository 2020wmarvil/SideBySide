import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
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
import * as ImagePicker from "expo-image-picker";
import { useClipLibrary } from "@/data/ClipLibraryContext";
import { allTags, tagCounts } from "@/data/clipRepository";
import { useThumbnail } from "@/hooks/useThumbnail";
import { usePortraitLock } from "@/hooks/usePortraitLock";
import { usePlaybackSession } from "@/state/PlaybackSessionContext";
import { TagEditor } from "@/components/shared/TagEditor";
import { slotName } from "@/lib/format";
import type { Clip, Slot } from "@/data/types";
import { color, radius, space, withAlpha } from "@/theme";

function formatSize(bytes?: number): string {
  if (!bytes) return "";
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function titleFromFileName(fileName?: string | null): string {
  return fileName?.replace(/\.[^/.]+$/, "") ?? "Imported clip";
}

// Below this width (portrait phones) the fixed-width preview column leaves
// too little room for the tag form beside it — stack them instead.
const WIDE_LAYOUT_MIN_WIDTH = 500;

export default function ImportScreen() {
  usePortraitLock();

  const { slot } = useLocalSearchParams<{ slot?: Slot }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { clips, addClip } = useClipLibrary();
  const session = usePlaybackSession();
  const [permission, requestPermission] = ImagePicker.useMediaLibraryPermissions();

  const isWide = width >= WIDE_LAYOUT_MIN_WIDTH;

  const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [picking, setPicking] = useState(false);
  // Replace mode (slot param present): inherits the outgoing clip's tags
  // (same trick, new attempt) same as Record's replace flow.
  const [importTags, setImportTags] = useState<string[]>(() => {
    if (!slot) return [];
    return clips.find((c) => c.id === session.clips[slot].clipId)?.tags ?? [];
  });
  const [titleInput, setTitleInput] = useState("");

  const thumbUri = useThumbnail(asset?.uri ?? null);
  const backTo = slot ? "/playback" : "/";

  // Defaults the name field to the picked file's name each time a new asset
  // is chosen (fires once per pick since `asset` is a fresh object each
  // time), while leaving room for the user to overwrite it below.
  useEffect(() => {
    if (asset) setTitleInput(titleFromFileName(asset.fileName));
  }, [asset]);

  // Only ever called from a Pressable's onPress — expo-image-picker's web
  // implementation opens a hidden <input type="file">, and browsers only
  // honor that programmatic click as a real picker when it's triggered by
  // a genuine user gesture. Calling this from an effect on mount (auto-
  // launching the picker as soon as the screen is reached) silently does
  // nothing on web, so every platform goes through the same explicit tap.
  const pickVideo = async () => {
    setPicking(true);
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        setPicking(false);
        return;
      }
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["videos"], quality: 1 });
    setPicking(false);
    const picked = result.canceled ? null : (result.assets?.[0] ?? null);
    if (picked) setAsset(picked);
  };

  const handleSave = () => {
    if (!asset) return;
    const newClip: Clip = {
      id: `clip-${Date.now()}`,
      uri: asset.uri,
      title: titleInput.trim() || titleFromFileName(asset.fileName),
      tags: importTags,
      createdAt: Date.now(),
      durationSec: asset.duration ? asset.duration / 1000 : undefined,
    };
    addClip(newClip);
    if (slot) {
      session.loadClip(slot, newClip, { keepFraming: true });
      router.replace("/playback");
    } else {
      router.replace("/");
    }
  };

  if (picking) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <ActivityIndicator color={color.accent} />
      </View>
    );
  }

  if (!asset) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.replace(backTo)}>
            <Ionicons name="arrow-back" size={16} color={color.text} />
          </Pressable>
        </View>
        <View style={[styles.centered, { flex: 1, gap: space[3], paddingHorizontal: 40 }]}>
          <Ionicons name="folder-open-outline" size={34} color={color.neutral600} />
          <Text style={styles.pickPromptTitle}>
            {slot ? `Replace ${slotName(slot, session.top)}` : "Pick a video to import"}
          </Text>
          <Text style={styles.pickPromptBody}>
            {slot
              ? "Pick a replacement already in your library, choose one from local storage, or record a new attempt now."
              : "Choose a clip from local storage or record something new."}
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: space[3], marginTop: 2 }}>
            {slot && (
              <Pressable
                style={styles.cancelButton}
                onPress={() => router.push({ pathname: "/", params: { slot } })}
              >
                <Text style={styles.cancelButtonText}>Library</Text>
              </Pressable>
            )}
            <Pressable style={styles.saveButton} onPress={pickVideo}>
              <Text style={styles.saveButtonText}>Local Storage</Text>
            </Pressable>
            <Pressable
              style={styles.cancelButton}
              onPress={() =>
                router.push(slot ? { pathname: "/record", params: { slot } } : { pathname: "/record" })
              }
            >
              <Text style={styles.cancelButtonText}>Record</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.replace(backTo)}>
          <Ionicons name="arrow-back" size={16} color={color.text} />
        </Pressable>
        <Text style={styles.headerTitle}>{slot ? `Replace ${slotName(slot, session.top)}` : "Tag this clip"}</Text>
        <Text style={styles.headerSubtitle}>from device storage</Text>
      </View>

      <ScrollView
        style={styles.bodyScroll}
        contentContainerStyle={[styles.body, !isWide && styles.bodyNarrow]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.previewCol, !isWide && styles.previewColNarrow]}>
          {thumbUri ? (
            <Image source={{ uri: thumbUri }} style={styles.preview} resizeMode="cover" />
          ) : (
            <View style={[styles.preview, styles.previewPlaceholder]}>
              <Ionicons name="film-outline" size={24} color={color.neutral600} />
            </View>
          )}
          <Text style={styles.fileName} numberOfLines={1}>
            {asset.fileName ?? "Video"}
          </Text>
          <Text style={styles.fileMeta}>{formatSize(asset.fileSize) || "Local file"}</Text>
        </View>

        <View style={[styles.formCol, !isWide && styles.formColNarrow]}>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Name</Text>
            <TextInput
              style={styles.nameInput}
              value={titleInput}
              onChangeText={setTitleInput}
              placeholder="Clip name"
              placeholderTextColor={color.textFaint}
              autoComplete="off"
              autoCorrect={false}
              spellCheck={false}
              importantForAutofill="no"
              returnKeyType="done"
            />
          </View>
          <TagEditor tags={importTags} onChange={setImportTags} allTags={allTags(clips)} tagCounts={tagCounts(clips)} />
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }, !isWide && styles.footerNarrow]}>
        <Text style={styles.footerHint}>Mix trick, person, gym — no fixed fields.</Text>
        <View style={[styles.footerButtons, !isWide && styles.footerButtonsNarrow]}>
          <Pressable style={styles.cancelButton} onPress={() => router.replace(backTo)}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
          <Pressable style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>
              {slot ? `Replace ${slotName(slot, session.top)}` : "Add to library"}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  centered: { alignItems: "center", justifyContent: "center" },
  pickPromptTitle: { fontSize: 17, fontWeight: "500", color: color.text, textAlign: "center" },
  pickPromptBody: { fontSize: 12, color: color.textMuted, textAlign: "center", maxWidth: 320 },
  header: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
  },
  backButton: {
    width: 30,
    height: 30,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.divider,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 17, fontWeight: "500", color: color.text },
  headerSubtitle: { fontSize: 11, color: color.textFaint },
  bodyScroll: { flex: 1 },
  body: { flexDirection: "row", gap: space[4], padding: 14 },
  bodyNarrow: { flexDirection: "column" },
  previewCol: { width: 220, gap: space[2] },
  previewColNarrow: { width: "100%" },
  preview: { width: "100%", height: 150, borderRadius: radius.md },
  previewPlaceholder: { backgroundColor: color.neutral900, alignItems: "center", justifyContent: "center" },
  fileName: { fontSize: 12, color: color.text },
  fileMeta: { fontSize: 11, color: color.textFaint },
  formCol: { flex: 1, minWidth: 0, gap: space[3] },
  formColNarrow: { flex: undefined },
  field: { gap: 5 },
  fieldLabel: { fontSize: 12, color: withAlpha(color.text, 0.7) },
  nameInput: {
    minHeight: 36,
    paddingHorizontal: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.divider,
    backgroundColor: color.surface,
    color: color.text,
    fontSize: 13,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: color.divider,
  },
  footerNarrow: { flexDirection: "column", alignItems: "stretch", gap: space[2] },
  footerHint: { flex: 1, fontSize: 11, color: color.textFaint },
  footerButtons: { flexDirection: "row", gap: space[3] },
  footerButtonsNarrow: { justifyContent: "flex-end" },
  cancelButton: {
    borderWidth: 1,
    borderColor: color.divider,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cancelButtonText: { fontSize: 12, color: color.text },
  saveButton: {
    borderWidth: 1,
    borderColor: color.accent,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  saveButtonText: { fontSize: 12, color: color.accent },
});
