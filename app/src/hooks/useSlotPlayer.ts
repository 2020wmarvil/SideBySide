import { useEffect, useRef } from "react";
import { useVideoPlayer } from "expo-video";

/**
 * Wraps useVideoPlayer for a slot whose source (uri) can change later
 * (load from library, replace via recording) — useVideoPlayer only reads
 * its source argument on first mount, so later changes are pushed via
 * replaceAsync instead.
 */
export function useSlotPlayer(uri: string | null) {
  const player = useVideoPlayer(uri, (p) => {
    p.muted = true;
    p.loop = false;
  });

  const initialUri = useRef(uri);
  const isFirstEffect = useRef(true);

  useEffect(() => {
    if (isFirstEffect.current) {
      isFirstEffect.current = false;
      // already loaded as the player's initial source — no-op.
      if (uri === initialUri.current) return;
    }
    if (uri) player.replaceAsync(uri);
  }, [uri, player]);

  return player;
}
