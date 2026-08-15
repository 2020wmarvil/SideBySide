import { Pressable, StyleSheet, Text } from "react-native";
import { color, radius } from "@/theme";

type TagChipProps = {
  label: string;
  active: boolean;
  onPress: () => void;
};

export function TagChip({ label, active, onPress }: TagChipProps) {
  return (
    <Pressable style={[styles.chip, active ? styles.chipActive : styles.chipOutline]} onPress={onPress}>
      <Text style={[styles.text, active && styles.textActive]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: radius.sm,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  chipOutline: {
    borderWidth: 1,
    borderColor: color.accent,
  },
  chipActive: {
    backgroundColor: color.accent800,
  },
  text: {
    fontSize: 11,
    color: color.accent,
  },
  textActive: {
    color: color.accent100,
  },
});
