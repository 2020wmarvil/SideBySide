import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Clip } from "./types";

const STORAGE_KEY = "sidebyside.clips.v1";

export async function loadClips(): Promise<Clip[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveClips(clips: Clip[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(clips));
}

export function allTags(clips: Clip[]): string[] {
  const seen: string[] = [];
  for (const c of clips) {
    for (const t of c.tags) {
      if (!seen.includes(t)) seen.push(t);
    }
  }
  return seen;
}

export function tagCounts(clips: Clip[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const c of clips) {
    for (const t of c.tags) {
      counts[t] = (counts[t] ?? 0) + 1;
    }
  }
  return counts;
}

export function filterClips(clips: Clip[], query: string, tags: string[]): Clip[] {
  const q = query.trim().toLowerCase();
  return clips.filter(
    (c) =>
      (!q || c.tags.some((t) => t.includes(q)) || c.title.toLowerCase().includes(q)) &&
      (!tags.length || tags.every((t) => c.tags.includes(t)))
  );
}
