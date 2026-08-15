import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";
import { useClipLibrary } from "@/data/ClipLibraryContext";
import { usePlaybackSession } from "@/state/PlaybackSessionContext";
import { color, space } from "@/theme";

export default function PlaybackScreen() {
  const { clips, loading } = useClipLibrary();
  const { clips: slots, loadClip } = usePlaybackSession();

  useEffect(() => {
    if (loading || clips.length === 0) return;
    if (!slots.L.uri) loadClip("L", clips[0]);
    if (!slots.R.uri) loadClip("R", clips[1] ?? clips[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, clips]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Trick Comparer</Text>
      <Text style={styles.subtitle}>
        {loading ? "Loading library…" : `L: ${slots.L.title || "—"}  ·  R: ${slots.R.title || "—"}`}
      </Text>
      <View style={styles.links}>
        <Link href="/library" style={styles.link}>
          Library
        </Link>
        <Link href="/import" style={styles.link}>
          Import + tagging
        </Link>
        <Link href={{ pathname: "/record", params: { slot: "L" } }} style={styles.link}>
          Record / replace
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: color.bg,
    alignItems: "center",
    justifyContent: "center",
    gap: space[4],
    padding: space[6],
  },
  title: { color: color.text, fontSize: 22, fontWeight: "600" },
  subtitle: { color: color.textMuted, fontSize: 13, textAlign: "center" },
  links: { flexDirection: "row", gap: space[4], marginTop: space[6] },
  link: { color: color.accent, fontSize: 14 },
});
