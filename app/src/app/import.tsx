import { StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";
import { color, space } from "@/theme";

export default function ImportScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tag this clip</Text>
      <Link href="/library" style={styles.link}>
        Back to library
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
