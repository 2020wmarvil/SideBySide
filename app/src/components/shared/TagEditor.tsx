import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { color, radius, space, withAlpha } from "@/theme";

type TagEditorProps = {
  tags: string[];
  onChange: (next: string[]) => void;
  allTags: string[];
  tagCounts: Record<string, number>;
};

/** Tag input with autocomplete + a removable chip row. Shared by Import
 * and Record's add-new-clip flow — port of the prototype's tagInput/
 * addTag/rmTag/sug handling. */
export function TagEditor({ tags, onChange, allTags, tagCounts }: TagEditorProps) {
  const [tagInput, setTagInput] = useState("");

  const addTag = (raw: string) => {
    const n = raw.trim().toLowerCase();
    if (!n) return;
    if (!tags.includes(n)) onChange([...tags, n]);
    setTagInput("");
  };
  const removeTag = (t: string) => onChange(tags.filter((x) => x !== t));

  const ti = tagInput.trim().toLowerCase();
  const suggestions = ti ? allTags.filter((t) => t.includes(ti) && !tags.includes(t)).slice(0, 4) : [];

  return (
    <View style={styles.wrap}>
      <View style={styles.field}>
        <Text style={styles.label}>Tags</Text>
        <TextInput
          style={styles.input}
          placeholder="Type a tag, e.g. backflip"
          placeholderTextColor={color.textFaint}
          value={tagInput}
          onChangeText={setTagInput}
          onSubmitEditing={() => addTag(tagInput)}
          returnKeyType="done"
          autoCapitalize="none"
          autoComplete="off"
          autoCorrect={false}
          spellCheck={false}
          importantForAutofill="no"
        />
      </View>

      {suggestions.length > 0 && (
        <View style={styles.suggestions}>
          {suggestions.map((t) => (
            <Pressable key={t} style={styles.suggestionRow} onPress={() => addTag(t)}>
              <Ionicons name="pricetag-outline" size={13} color={color.accent} />
              <Text style={styles.suggestionText}>{t}</Text>
              <Text style={styles.suggestionCount}>{tagCounts[t] ?? 0} clips</Text>
            </Pressable>
          ))}
        </View>
      )}

      <View style={styles.tagRow}>
        {tags.map((t) => (
          <Pressable key={t} style={styles.tagChip} onPress={() => removeTag(t)}>
            <Text style={styles.tagChipText}>{t}</Text>
            <Ionicons name="close" size={10} color={color.accent100} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space[2] },
  field: { gap: 5 },
  label: { fontSize: 12, color: withAlpha(color.text, 0.7) },
  input: {
    minHeight: 36,
    paddingHorizontal: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.divider,
    backgroundColor: color.surface,
    color: color.text,
    fontSize: 13,
  },
  suggestions: {
    borderRadius: radius.md,
    backgroundColor: color.surface,
    overflow: "hidden",
  },
  suggestionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  suggestionText: { fontSize: 12, color: color.text },
  suggestionCount: { marginLeft: "auto", fontSize: 10, color: color.textFaint },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 5, minHeight: 30 },
  tagChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: color.accent800,
  },
  tagChipText: { fontSize: 11, color: color.accent100 },
});
