import { StyleSheet, Text, View } from "react-native";
import { Link, useLocalSearchParams } from "expo-router";
import type { Slot } from "@/data/types";
import { color, space } from "@/theme";

export default function RecordScreen() {
  const { slot } = useLocalSearchParams<{ slot: Slot }>();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Replacing {slot === "R" ? "right" : "left"} slot</Text>
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
  link: { color: color.accent, fontSize: 14, marginTop: space[4] },
});
