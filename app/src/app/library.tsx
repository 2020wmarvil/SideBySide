import { StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";
import { useClipLibrary } from "@/data/ClipLibraryContext";
import { color, space } from "@/theme";

export default function LibraryScreen() {
  const { clips, loading } = useClipLibrary();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Library</Text>
      <Text style={styles.subtitle}>
        {loading ? "Loading…" : `${clips.length} clip${clips.length === 1 ? "" : "s"}`}
      </Text>
      <Link href="/" style={styles.link}>
        Back to playback
      </Link>
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
  subtitle: { color: color.textMuted, fontSize: 13 },
  link: { color: color.accent, fontSize: 14, marginTop: space[4] },
});
