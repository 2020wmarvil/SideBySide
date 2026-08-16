import { useEffect, useRef } from "react";
import { Platform } from "react-native";
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
    if (uri) {
      // expo-video's web `replace`/`replaceAsync` starts playback as a
      // side effect (its native implementations don't) — pause right
      // after so every platform ends up paused-until-play, matching what
      // this app actually wants on load/replace. Native skips the extra
      // pause() entirely: a rapid run of replaceAsync calls (e.g. spamming
      // swap-slots) queues one pause() per call, and a pause() landing
      // after a later replaceAsync has already moved the player on fails
      // with "shared object already released."
      const replaced = player.replaceAsync(uri);
      if (Platform.OS === "web") replaced.then(() => player.pause());
    }
  }, [uri, player]);

  return player;
}
