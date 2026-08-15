import { useEffect, useState } from "react";
import type { VideoPlayer } from "expo-video";

/** Tracks a video player's duration once its source metadata has loaded. */
export function useDuration(player: VideoPlayer): number {
  const [duration, setDuration] = useState(player.duration || 0);

  useEffect(() => {
    // `sourceLoad` is the documented event, but not every platform fires it
    // reliably (observed missing on web) — `statusChange` -> readyToPlay is
    // a solid fallback that reads `duration` straight off the player.
    const subs = [
      player.addListener("sourceLoad", (payload) => setDuration(payload.duration)),
      player.addListener("statusChange", () => {
        if (player.duration) setDuration(player.duration);
      }),
    ];
    return () => subs.forEach((s) => s.remove());
  }, [player]);

  return duration;
}
