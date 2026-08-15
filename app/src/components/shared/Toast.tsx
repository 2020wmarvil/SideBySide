import { StyleSheet, Text, View } from "react-native";
import { color, elevation } from "@/theme";

type ToastProps = {
  message: string;
  bottom: number;
};

export function Toast({ message, bottom }: ToastProps) {
  if (!message) return null;
  return (
    <View style={[styles.wrap, { bottom }]}>
      <View style={styles.pill}>
        <Text style={styles.text}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 9,
    alignItems: "center",
    pointerEvents: "none",
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: color.surface,
    elevation: elevation.md,
    boxShadow: "0px 8px 20px rgba(0, 0, 0, 0.4)",
  },
  text: {
    fontSize: 12,
    color: color.text,
  },
});
