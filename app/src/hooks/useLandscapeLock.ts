import { useEffect } from "react";
import * as ScreenOrientation from "expo-screen-orientation";

/**
 * Locks the screen to landscape while the calling screen is mounted,
 * restoring the default (portrait, per app.json) on unmount. Playback is
 * the one screen built around comparing two videos side by side — the
 * rest of the app (library, import, record) stays portrait.
 *
 * Screen-orientation locking isn't meaningful on web, so failures there
 * are swallowed rather than surfaced.
 */
export function useLandscapeLock() {
  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
    return () => {
      ScreenOrientation.unlockAsync().catch(() => {});
    };
  }, []);
}
