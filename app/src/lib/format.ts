export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function formatDuration(sec?: number): string | null {
  if (!sec) return null;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Describes a slot by its current on-screen side rather than its fixed
// data key ("L"/"R") — swapping (see PlaybackSessionContext.swapTop) flips
// which slot renders on which side without moving clip data, so a label
// keyed off the raw slot letter would drift out of sync with what the user
// actually tapped as soon as they'd swapped once.
export function slotName(slot: "L" | "R", top: "L" | "R"): string {
  return slot === top ? "left slot" : "right slot";
}
