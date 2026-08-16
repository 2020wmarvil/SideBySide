import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions, useMicrophonePermissions } from "expo-camera";
import * as ScreenOrientation from "expo-screen-orientation";
import { useClipLibrary } from "@/data/ClipLibraryContext";
import { allTags, tagCounts } from "@/data/clipRepository";
import { persistRecording } from "@/data/recordings";
import { usePlaybackSession } from "@/state/PlaybackSessionContext";
import { useThumbnail } from "@/hooks/useThumbnail";
import { useFreeOrientation } from "@/hooks/useFreeOrientation";
import { TagEditor } from "@/components/shared/TagEditor";
import { slotName } from "@/lib/format";
import type { Clip, Slot } from "@/data/types";
import { color, radius, space, withAlpha } from "@/theme";

type Phase = "ready" | "recording" | "review" | "tagging";

// Android's video encoder doesn't reliably tag a recording's rotation while
// the screen orientation is left free (OrientationLock.ALL): it needs a
// single definitive orientation at the moment recording starts, or the
// clip comes out rotated regardless of which way the device was actually
// held. Locking to the device's current orientation for the duration of
// the take (like a native camera app, where only the preview keeps
// rotating) works around this; the lock is freed back to ALL once the
// take is done so the review controls can rotate again.
const orientationLockFor: Partial<Record<ScreenOrientation.Orientation, ScreenOrientation.OrientationLock>> = {
  [ScreenOrientation.Orientation.PORTRAIT_UP]: ScreenOrientation.OrientationLock.PORTRAIT_UP,
  [ScreenOrientation.Orientation.PORTRAIT_DOWN]: ScreenOrientation.OrientationLock.PORTRAIT_DOWN,
  [ScreenOrientation.Orientation.LANDSCAPE_LEFT]: ScreenOrientation.OrientationLock.LANDSCAPE_LEFT,
  [ScreenOrientation.Orientation.LANDSCAPE_RIGHT]: ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT,
};

async function lockToCurrentOrientation() {
  const current = await ScreenOrientation.getOrientationAsync();
  const lock = orientationLockFor[current] ?? ScreenOrientation.OrientationLock.PORTRAIT_UP;
  await ScreenOrientation.lockAsync(lock);
}

export default function RecordScreen() {
  const { slot } = useLocalSearchParams<{ slot?: Slot }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const session = usePlaybackSession();
  const { clips, addClip } = useClipLibrary();

  const [permission, requestPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const cameraRef = useRef<CameraView>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [phase, setPhase] = useState<Phase>("ready");
  const [elapsedTenths, setElapsedTenths] = useState(0);
  const [takeUri, setTakeUri] = useState<string | null>(null);
  const [newClipTags, setNewClipTags] = useState<string[]>([]);

  const takeThumb = useThumbnail(takeUri);
  const granted = !!permission?.granted && !!micPermission?.granted;

  useFreeOrientation();

  useEffect(() => {
    if (!permission?.granted) requestPermission();
    if (!micPermission?.granted) requestMicPermission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const backOut = () => router.replace(slot ? "/" : "/library");

  const startRecording = async () => {
    if (!cameraRef.current) return;
    await lockToCurrentOrientation();
    setPhase("recording");
    setElapsedTenths(0);
    timerRef.current = setInterval(() => setElapsedTenths((n) => n + 1), 100);
    const result = await cameraRef.current.recordAsync();
    if (timerRef.current) clearInterval(timerRef.current);
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.ALL).catch(() => {});
    if (result?.uri) {
      setTakeUri(result.uri);
      setPhase("review");
    } else {
      setPhase("ready");
    }
  };

  const stopRecording = () => cameraRef.current?.stopRecording();

  const retake = () => {
    setTakeUri(null);
    setNewClipTags([]);
    setPhase("ready");
  };

  const durationSec = elapsedTenths / 10;

  // Replace mode (slot param present): inherits the outgoing clip's tags
  // (same trick, new attempt) and drops straight back into Playback with
  // that slot's pan/zoom untouched.
  const applyTakeToSlot = (targetSlot: Slot) => {
    if (!takeUri) return;
    const persistedUri = persistRecording(takeUri);
    const priorClip = clips.find((c) => c.id === session.clips[targetSlot].clipId);
    const tags = priorClip?.tags ?? [];
    const newClip: Clip = {
      id: `clip-${Date.now()}`,
      uri: persistedUri,
      title: tags.length ? `${tags.join(" · ")} — new take` : "New take",
      tags,
      createdAt: Date.now(),
      durationSec,
    };
    addClip(newClip);
    session.loadClip(targetSlot, newClip, { keepFraming: true });
    router.replace("/");
  };

  // Add-new mode (no slot param): there's no existing clip to inherit tags
  // from, so this is a fresh clip that needs its own tags before it's
  // useful in the library — same tagging step Import uses.
  const saveNewClip = () => {
    if (!takeUri) return;
    const persistedUri = persistRecording(takeUri);
    addClip({
      id: `clip-${Date.now()}`,
      uri: persistedUri,
      title: newClipTags.length ? newClipTags.join(" · ") : "Recorded clip",
      tags: newClipTags,
      createdAt: Date.now(),
      durationSec,
    });
    router.replace("/library");
  };

  if (!permission || !micPermission) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <ActivityIndicator color={color.accent} />
      </View>
    );
  }

  if (!granted) {
    const canAskAgain = permission.canAskAgain && micPermission.canAskAgain;
    const handleAllow = () => {
      if (!permission.granted) requestPermission();
      if (!micPermission.granted) requestMicPermission();
    };
    return (
      <View style={[styles.screen, styles.centered, { gap: space[3], paddingHorizontal: 40 }]}>
        <Ionicons name="videocam-off-outline" size={34} color={color.neutral600} />
        <Text style={styles.promptTitle}>Camera & microphone access needed</Text>
        <Text style={styles.promptBody}>
          {canAskAgain
            ? "Allow camera and microphone access to record a trick attempt with sound."
            : "Camera or microphone access was denied. Enable both in system settings to record."}
        </Text>
        <View style={{ flexDirection: "row", gap: space[3] }}>
          {canAskAgain && (
            <Pressable style={styles.primaryButton} onPress={handleAllow}>
              <Text style={styles.primaryButtonText}>Allow access</Text>
            </Pressable>
          )}
          <Pressable style={styles.secondaryButton} onPress={backOut}>
            <Text style={styles.secondaryButtonText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (phase === "tagging") {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable style={styles.iconButton} onPress={() => setPhase("review")}>
            <Ionicons name="arrow-back" size={16} color={color.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Tag this clip</Text>
        </View>
        <View style={styles.body}>
          <View style={styles.previewCol}>
            {takeThumb ? (
              <Image source={{ uri: takeThumb }} style={styles.preview} resizeMode="cover" />
            ) : (
              <View style={[styles.preview, styles.previewPlaceholder]}>
                <Ionicons name="film-outline" size={24} color={color.neutral600} />
              </View>
            )}
            <Text style={styles.fileMeta}>{durationSec.toFixed(1)}s recording</Text>
          </View>
          <View style={styles.formCol}>
            <TagEditor
              tags={newClipTags}
              onChange={setNewClipTags}
              allTags={allTags(clips)}
              tagCounts={tagCounts(clips)}
            />
            <View style={styles.footer}>
              <Text style={styles.footerHint}>Mix trick, person, gym — no fixed fields.</Text>
              <Pressable style={styles.secondaryButton} onPress={() => setPhase("review")}>
                <Text style={styles.secondaryButtonText}>Back</Text>
              </Pressable>
              <Pressable style={styles.primaryButton} onPress={saveNewClip}>
                <Text style={styles.primaryButtonText}>Add to library</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    );
  }

  if (phase === "review") {
    return (
      <View style={styles.screen}>
        {takeThumb ? (
          <Image source={{ uri: takeThumb }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.previewPlaceholder]} />
        )}
        <View style={[styles.reviewSheetWrap, { paddingBottom: insets.bottom + 14 }]}>
          <View style={styles.reviewSheet}>
            <Text style={styles.reviewText}>Take of {durationSec.toFixed(1)}s — use it?</Text>
            <View style={{ flexDirection: "row", gap: 6 }}>
              <Pressable style={styles.secondaryButton} onPress={retake}>
                <Text style={styles.secondaryButtonText}>Retake</Text>
              </Pressable>
              {slot ? (
                <Pressable style={styles.primaryButton} onPress={() => applyTakeToSlot(slot)}>
                  <Text style={styles.primaryButtonText}>Replace {slotName(slot, session.top)}</Text>
                </Pressable>
              ) : (
                <Pressable style={styles.primaryButton} onPress={() => setPhase("tagging")}>
                  <Text style={styles.primaryButtonText}>Use this take</Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} mode="video" facing="back" />
      <View style={styles.framingGuide} pointerEvents="none" />

      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        {phase === "recording" && (
          <View style={styles.recIndicator}>
            <View style={styles.recDot} />
            <Text style={styles.recText}>{durationSec.toFixed(1)}s</Text>
          </View>
        )}
      </View>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 14 }]}>
        {phase === "ready" && (
          <>
            <Pressable style={styles.backButton} onPress={backOut}>
              <Ionicons name="arrow-back" size={16} color={color.text} />
            </Pressable>
            <Pressable style={styles.recordButton} onPress={startRecording} />
            <View style={styles.backButtonSpacer} />
          </>
        )}
        {phase === "recording" && <Pressable style={styles.stopButton} onPress={stopRecording} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#000" },
  centered: { alignItems: "center", justifyContent: "center" },
  promptTitle: { fontSize: 17, fontWeight: "500", color: color.text, textAlign: "center" },
  promptBody: { fontSize: 12, color: color.textMuted, textAlign: "center", maxWidth: 320 },
  framingGuide: {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: 220,
    height: 140,
    marginLeft: -110,
    marginTop: -70,
    borderWidth: 1,
    borderColor: withAlpha(color.text, 0.25),
    borderRadius: radius.sm,
  },
  topBar: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    paddingHorizontal: 14,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
  },
  recIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 20,
    backgroundColor: withAlpha(color.stageBg, 0.7),
  },
  recDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: color.accent },
  recText: { fontSize: 12, color: color.text, fontVariant: ["tabular-nums"] },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: withAlpha(color.text, 0.25),
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonSpacer: { width: 40 },
  recordButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: color.text,
    backgroundColor: color.accent,
  },
  stopButton: {
    width: 52,
    height: 52,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: color.neutral100,
    backgroundColor: color.accent,
  },
  reviewSheetWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    paddingHorizontal: 14,
  },
  reviewSheet: {
    width: "100%",
    maxWidth: 420,
    padding: space[4],
    borderRadius: radius.lg,
    backgroundColor: color.surface,
    gap: space[3],
  },
  reviewText: { fontSize: 13, color: color.text },
  header: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
  },
  iconButton: {
    width: 30,
    height: 30,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.divider,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 17, fontWeight: "500", color: color.text },
  body: { flex: 1, flexDirection: "row", gap: space[4], padding: 14, backgroundColor: color.bg },
  previewCol: { width: 220, gap: space[2] },
  preview: { width: "100%", height: 150, borderRadius: radius.md },
  previewPlaceholder: { backgroundColor: color.neutral900, alignItems: "center", justifyContent: "center" },
  fileMeta: { fontSize: 11, color: color.textFaint },
  formCol: { flex: 1, minWidth: 0, gap: space[2] },
  footer: { marginTop: "auto", flexDirection: "row", alignItems: "center", gap: space[3] },
  footerHint: { flex: 1, fontSize: 11, color: color.textFaint },
  secondaryButton: {
    borderWidth: 1,
    borderColor: color.divider,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  secondaryButtonText: { fontSize: 12, color: color.text },
  primaryButton: {
    borderWidth: 1,
    borderColor: color.accent,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  primaryButtonText: { fontSize: 12, color: color.accent },
});
