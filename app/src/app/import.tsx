import { useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useClipLibrary } from "@/data/ClipLibraryContext";
import { allTags, tagCounts } from "@/data/clipRepository";
import { useThumbnail } from "@/hooks/useThumbnail";
import { TagEditor } from "@/components/shared/TagEditor";
import { color, radius, space } from "@/theme";

function formatSize(bytes?: number): string {
  if (!bytes) return "";
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function titleFor(tags: string[], fileName?: string | null): string {
  if (tags.length > 0) return tags.join(" · ");
  return fileName?.replace(/\.[^/.]+$/, "") ?? "Imported clip";
}

export default function ImportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { clips, addClip } = useClipLibrary();
  const [permission, requestPermission] = ImagePicker.useMediaLibraryPermissions();

  const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [picking, setPicking] = useState(false);
  const [importTags, setImportTags] = useState<string[]>([]);

  const thumbUri = useThumbnail(asset?.uri ?? null);

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
    addClip({
      id: `clip-${Date.now()}`,
      uri: asset.uri,
      title: titleFor(importTags, asset.fileName),
      tags: importTags,
      createdAt: Date.now(),
      durationSec: asset.duration ? asset.duration / 1000 : undefined,
    });
    router.replace("/library");
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
      <View style={[styles.screen, styles.centered, { gap: space[3], paddingHorizontal: 40 }]}>
        <Ionicons name="folder-open-outline" size={34} color={color.neutral600} />
        <Text style={styles.pickPromptTitle}>Pick a video to import</Text>
        <Text style={styles.pickPromptBody}>Choose a clip from local storage — screen recording, download, or anything already on the device.</Text>
        <View style={{ flexDirection: "row", gap: space[3], marginTop: 2 }}>
          <Pressable style={styles.saveButton} onPress={pickVideo}>
            <Text style={styles.saveButtonText}>Choose video</Text>
          </Pressable>
          <Pressable style={styles.cancelButton} onPress={() => router.replace("/library")}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.replace("/library")}>
          <Ionicons name="arrow-back" size={16} color={color.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Tag this clip</Text>
        <Text style={styles.headerSubtitle}>from device storage</Text>
      </View>

      <View style={styles.body}>
        <View style={styles.previewCol}>
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

        <View style={styles.formCol}>
          <TagEditor tags={importTags} onChange={setImportTags} allTags={allTags(clips)} tagCounts={tagCounts(clips)} />

          <View style={styles.footer}>
            <Text style={styles.footerHint}>Mix trick, person, gym — no fixed fields.</Text>
            <Pressable style={styles.cancelButton} onPress={() => router.replace("/library")}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Add to library</Text>
            </Pressable>
          </View>
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
  body: { flex: 1, flexDirection: "row", gap: space[4], padding: 14 },
  previewCol: { width: 220, gap: space[2] },
  preview: { width: "100%", height: 150, borderRadius: radius.md },
  previewPlaceholder: { backgroundColor: color.neutral900, alignItems: "center", justifyContent: "center" },
  fileName: { fontSize: 12, color: color.text },
  fileMeta: { fontSize: 11, color: color.textFaint },
  formCol: { flex: 1, minWidth: 0, gap: space[2] },
  footer: { marginTop: "auto", flexDirection: "row", alignItems: "center", gap: space[3] },
  footerHint: { flex: 1, fontSize: 11, color: color.textFaint },
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
