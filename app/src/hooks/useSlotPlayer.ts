import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { useVideoPlayer } from "expo-video";

/**
 * Wraps useVideoPlayer for a slot whose source (uri) can change later
 * (load from library, replace via recording) — useVideoPlayer only reads
 * its source argument on first mount, so later changes are pushed via
 * replaceAsync instead.
 */
export function useSlotPlayer(uri: string | null, options?: { muted?: boolean; loop?: boolean }) {
  const { muted = true, loop = false } = options ?? {};
  const player = useVideoPlayer(uri, (p) => {
    p.muted = muted;
    p.loop = loop;
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

  // Android's ExoPlayer decodes the first frame of a freshly (re)loaded
  // source into its buffer but never pushes it to the TextureView surface
  // until something forces a redraw (a seek, a play/pause cycle). Left
  // alone, the pane just sits black until the user happens to touch a
  // control that seeks (trim handle, scrub bar) — this covers both the
  // player's very first load and every later replaceAsync, priming each
  // distinct source exactly once as soon as it's ready. Guarded on
  // `playing` so it never fights active playback (e.g. a slot replaced
  // mid-loop while locked).
  const primedUri = useRef<string | null>(null);
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const sub = player.addListener("statusChange", ({ status }) => {
      if (status !== "readyToPlay" || player.playing || primedUri.current === uri) return;
      primedUri.current = uri;
      const t = player.currentTime;
      player.currentTime = t + 0.001;
      player.currentTime = t;
    });
    return () => sub.remove();
  }, [player, uri]);

  return player;
}
