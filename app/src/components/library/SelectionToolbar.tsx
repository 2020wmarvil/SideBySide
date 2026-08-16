import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { color, radius, space } from "@/theme";

type SelectionToolbarProps = {
  count: number;
  onCancel: () => void;
  onRename?: () => void;
  onEditTags: () => void;
  onDelete: () => void;
};

export function SelectionToolbar({ count, onCancel, onRename, onEditTags, onDelete }: SelectionToolbarProps) {
  return (
    <View style={styles.bar}>
      <Pressable style={styles.iconButton} onPress={onCancel}>
        <Ionicons name="close" size={16} color={color.text} />
      </Pressable>
      <Text style={styles.count}>{count} selected</Text>
      <View style={styles.actions}>
        {onRename && (
          <Pressable style={styles.actionButton} onPress={onRename}>
            <Ionicons name="pencil-outline" size={14} color={color.text} />
            <Text style={styles.actionText}>Rename</Text>
          </Pressable>
        )}
        <Pressable style={styles.actionButton} onPress={onEditTags}>
          <Ionicons name="pricetag-outline" size={14} color={color.text} />
          <Text style={styles.actionText}>Tags</Text>
        </Pressable>
        <Pressable style={[styles.actionButton, styles.deleteButton]} onPress={onDelete}>
          <Ionicons name="trash-outline" size={14} color={color.danger} />
          <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
  },
  iconButton: {
    width: 28,
    height: 28,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.divider,
    alignItems: "center",
    justifyContent: "center",
  },
  count: { fontSize: 13, color: color.text },
  actions: { marginLeft: "auto", flexDirection: "row", gap: 6 },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: color.divider,
    borderRadius: radius.md,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  actionText: { fontSize: 12, color: color.text },
  deleteButton: { borderColor: color.danger },
  deleteText: { color: color.danger },
});
