import { useEffect, useState } from "react";
import * as VideoThumbnails from "expo-video-thumbnails";

// module-level so re-mounting a card (e.g. scrolling it off/on screen)
// doesn't regenerate a thumbnail that's already been made this session.
const cache = new Map<string, string | null>();

export function useThumbnail(uri: string | null): string | null {
  const [thumbUri, setThumbUri] = useState<string | null>(() => (uri ? (cache.get(uri) ?? null) : null));

  useEffect(() => {
    if (!uri || cache.has(uri)) return;
    let cancelled = false;
    VideoThumbnails.getThumbnailAsync(uri, { time: 0 })
      .then(({ uri: thumb }) => {
        cache.set(uri, thumb);
        if (!cancelled) setThumbUri(thumb);
      })
      .catch(() => {
        // thumbnails aren't supported on every platform (e.g. web) — the
        // card just falls back to its placeholder icon.
        cache.set(uri, null);
        if (!cancelled) setThumbUri(null);
      });
    return () => {
      cancelled = true;
    };
  }, [uri]);

  return thumbUri;
}
