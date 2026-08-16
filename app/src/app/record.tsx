import { useEffect, useRef, useState } from "react";
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
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions, useMicrophonePermissions } from "expo-camera";
import * as ScreenOrientation from "expo-screen-orientation";
import { VideoView } from "expo-video";
import { useClipLibrary } from "@/data/ClipLibraryContext";
import { allTags, tagCounts } from "@/data/clipRepository";
import { persistRecording } from "@/data/recordings";
import { usePlaybackSession } from "@/state/PlaybackSessionContext";
import { useThumbnail } from "@/hooks/useThumbnail";
import { useSlotPlayer } from "@/hooks/useSlotPlayer";
import { useFreeOrientation } from "@/hooks/useFreeOrientation";
import { useImmersiveNavBar } from "@/hooks/useImmersiveNavBar";
import { TagEditor } from "@/components/shared/TagEditor";
import { slotName } from "@/lib/format";
import type { Clip, Slot } from "@/data/types";
import { color, radius, space, withAlpha } from "@/theme";

type Phase = "ready" | "recording" | "review" | "tagging";

// Below this width (portrait phones) the fixed-width preview column leaves
// too little room for the tag form beside it — stack them instead.
const WIDE_LAYOUT_MIN_WIDTH = 500;

// Android's video encoder doesn't reliably tag a recording's rotation if the
// screen orientation changes mid-take — it needs one definitive orientation
// for the full duration of the take, or the clip can come out rotated
// regardless of which way the device was actually held. Locking to whatever
// orientation is already current right before recordAsync starts (like a
// native camera app, where only the preview keeps rotating up to the moment
// the shutter is pressed) works around this without giving up free rotation
// for framing — see startRecording below.
const orientationLockFor: Partial<Record<ScreenOrientation.Orientation, ScreenOrientation.OrientationLock>> = {
  [ScreenOrientation.Orientation.PORTRAIT_UP]: ScreenOrientation.OrientationLock.PORTRAIT_UP,
  [ScreenOrientation.Orientation.PORTRAIT_DOWN]: ScreenOrientation.OrientationLock.PORTRAIT_DOWN,
  [ScreenOrientation.Orientation.LANDSCAPE_LEFT]: ScreenOrientation.OrientationLock.LANDSCAPE_LEFT,
  [ScreenOrientation.Orientation.LANDSCAPE_RIGHT]: ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT,
};

export default function RecordScreen() {
  const { slot } = useLocalSearchParams<{ slot?: Slot }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isWide = width >= WIDE_LAYOUT_MIN_WIDTH;
  const session = usePlaybackSession();
  const { clips, addClip } = useClipLibrary();

  const [permission, requestPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const cameraRef = useRef<CameraView>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [phase, setPhase] = useState<Phase>("ready");
  const [elapsedTenths, setElapsedTenths] = useState(0);
  const [takeUri, setTakeUri] = useState<string | null>(null);
  const [newClipTitle, setNewClipTitle] = useState("");
  const [newClipTags, setNewClipTags] = useState<string[]>([]);

  const takeThumb = useThumbnail(takeUri);
  const takePlayer = useSlotPlayer(takeUri, { muted: false, loop: true });
  const granted = !!permission?.granted && !!micPermission?.granted;

  // Autoplay the take on loop while the "use this take?" sheet is up so the
  // rider can watch it back without an extra tap — pause it the moment the
  // review sheet isn't the thing on screen (retake, tagging, or a fresh
  // recording) so it isn't still playing silently underneath.
  useEffect(() => {
    if (phase === "review") takePlayer.play();
    else takePlayer.pause();
  }, [phase, takePlayer, takeUri]);

  // Free to rotate while composing, in either orientation, like a native
  // camera app — startRecording below locks it down for the duration of the
  // actual take (see orientationLockFor above for why).
  useFreeOrientation();
  useImmersiveNavBar();

  useEffect(() => {
    if (!permission?.granted) requestPermission();
    if (!micPermission?.granted) requestMicPermission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tracks the most recent non-flat orientation so startRecording always has
  // something usable to lock to, even if getOrientationAsync() is read at
  // the exact instant the device is lying flat (Orientation.UNKNOWN) — the
  // listener only fires on a portrait<->landscape crossing, but that's fine
  // here since it's purely a fallback for the flat case, not the primary
  // read (startRecording re-checks getOrientationAsync() fresh every time).
  const lastKnownOrientation = useRef<ScreenOrientation.Orientation>(ScreenOrientation.Orientation.PORTRAIT_UP);
  useEffect(() => {
    const sub = ScreenOrientation.addOrientationChangeListener(({ orientationInfo }) => {
      if (orientationInfo.orientation !== ScreenOrientation.Orientation.UNKNOWN) {
        lastKnownOrientation.current = orientationInfo.orientation;
      }
    });
    return () => sub.remove();
  }, []);

  // Locking the screen isn't enough on its own: expo-camera's Android video
  // encoder only samples the device's rotation once, when its native camera
  // session is first bound, and never re-samples it afterwards (unlike photo
  // capture, which does track rotation live). If that initial bind happened
  // in portrait — which it does, since the screen opens in portrait before
  // anyone's rotated it — every take gets tagged as portrait even after
  // rotating to landscape and locking there. Remounting the CameraView (via
  // this key) forces a fresh bind that samples the *current*, now-locked
  // orientation; boundOrientationRef tracks which orientation the mounted
  // camera was last bound under so startRecording only pays for a remount
  // when the orientation has actually changed since the last take, not on
  // every single one.
  const [cameraKey, setCameraKey] = useState(0);
  const boundOrientationRef = useRef<ScreenOrientation.Orientation | null>(null);
  const cameraReadyResolveRef = useRef<(() => void) | null>(null);
  const handleCameraReady = () => {
    cameraReadyResolveRef.current?.();
    cameraReadyResolveRef.current = null;
  };
  // Bounded wait: if the rebind never reports ready (camera error, odd
  // device), fall back to recording anyway rather than freezing the ready
  // phase on a tap that silently does nothing.
  const waitForCameraReady = () =>
    new Promise<void>((resolve) => {
      cameraReadyResolveRef.current = resolve;
      setTimeout(resolve, 4000);
    });

  const backOut = () => router.replace(slot ? "/playback" : "/");

  const startRecording = async () => {
    if (!cameraRef.current) return;
    const current = await ScreenOrientation.getOrientationAsync();
    const orientation =
      current === ScreenOrientation.Orientation.UNKNOWN ? lastKnownOrientation.current : current;
    await ScreenOrientation.lockAsync(orientationLockFor[orientation] ?? ScreenOrientation.OrientationLock.PORTRAIT_UP);

    if (boundOrientationRef.current !== orientation) {
      const ready = waitForCameraReady();
      setCameraKey((k) => k + 1);
      await ready;
      boundOrientationRef.current = orientation;
      // The remount tears down and recreates cameraRef.current's native
      // view; the ref only points at the new instance once it re-renders.
      if (!cameraRef.current) return;
    }

    setPhase("recording");
    setElapsedTenths(0);
    timerRef.current = setInterval(() => setElapsedTenths((n) => n + 1), 100);
    const result = await cameraRef.current.recordAsync();
    if (timerRef.current) clearInterval(timerRef.current);
    // Free the lock back up once the take is done so review/tagging (and
    // the next take) can rotate again.
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
    setNewClipTitle("");
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
    router.replace("/playback");
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
      title: newClipTitle.trim() || (newClipTags.length ? newClipTags.join(" · ") : "Recorded clip"),
      tags: newClipTags,
      createdAt: Date.now(),
      durationSec,
    });
    router.replace("/");
  };

  if (!permission || !micPermission) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <StatusBar hidden />
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
        <StatusBar hidden />
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
        <StatusBar hidden />
        <View style={styles.header}>
          <Pressable style={styles.iconButton} onPress={() => setPhase("review")}>
            <Ionicons name="arrow-back" size={16} color={color.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Tag this clip</Text>
        </View>
        <ScrollView
          style={styles.bodyScroll}
          contentContainerStyle={[styles.body, !isWide && styles.bodyNarrow]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.previewCol, !isWide && styles.previewColNarrow]}>
            {takeThumb ? (
              <Image source={{ uri: takeThumb }} style={styles.preview} resizeMode="cover" />
            ) : (
              <View style={[styles.preview, styles.previewPlaceholder]}>
                <Ionicons name="film-outline" size={24} color={color.neutral600} />
              </View>
            )}
            <Text style={styles.fileMeta}>{durationSec.toFixed(1)}s recording</Text>
          </View>
          <View style={[styles.formCol, !isWide && styles.formColNarrow]}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Name</Text>
              <TextInput
                style={styles.nameInput}
                value={newClipTitle}
                onChangeText={setNewClipTitle}
                placeholder="Clip name"
                placeholderTextColor={color.textFaint}
                autoComplete="off"
                autoCorrect={false}
                spellCheck={false}
                importantForAutofill="no"
                returnKeyType="done"
              />
            </View>
            <TagEditor
              tags={newClipTags}
              onChange={setNewClipTags}
              allTags={allTags(clips)}
              tagCounts={tagCounts(clips)}
            />
          </View>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }, !isWide && styles.footerNarrow]}>
          <Text style={styles.footerHint}>Mix trick, person, gym — no fixed fields.</Text>
          <View style={[styles.footerButtons, !isWide && styles.footerButtonsNarrow]}>
            <Pressable style={styles.secondaryButton} onPress={() => setPhase("review")}>
              <Text style={styles.secondaryButtonText}>Back</Text>
            </Pressable>
            <Pressable style={styles.primaryButton} onPress={saveNewClip}>
              <Text style={styles.primaryButtonText}>Add to library</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  if (phase === "review") {
    return (
      <View style={styles.screen}>
        <StatusBar hidden />
        <VideoView
          player={takePlayer}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          nativeControls={false}
          surfaceType="textureView"
        />
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
      <StatusBar hidden />
      <CameraView
        key={cameraKey}
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        mode="video"
        facing="back"
        onCameraReady={handleCameraReady}
      />
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
  bodyScroll: { flex: 1, backgroundColor: color.bg },
  body: { flexDirection: "row", gap: space[4], padding: 14 },
  bodyNarrow: { flexDirection: "column" },
  previewCol: { width: 220, gap: space[2] },
  previewColNarrow: { width: "100%" },
  preview: { width: "100%", height: 150, borderRadius: radius.md },
  previewPlaceholder: { backgroundColor: color.neutral900, alignItems: "center", justifyContent: "center" },
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
    backgroundColor: color.bg,
  },
  footerNarrow: { flexDirection: "column", alignItems: "stretch", gap: space[2] },
  footerHint: { flex: 1, fontSize: 11, color: color.textFaint },
  footerButtons: { flexDirection: "row", gap: space[3] },
  footerButtonsNarrow: { justifyContent: "flex-end" },
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
