import { useEffect } from "react";
import * as ScreenOrientation from "expo-screen-orientation";

/**
 * Locks the screen to portrait while the calling screen is mounted.
 * Screens reached mid-rotation (e.g. backing out of playback, or hitting
 * replace, while the device is still physically sideways) need this
 * explicit lock rather than just unlockAsync — unlocking only lifts the
 * previous constraint, it doesn't force portrait back on its own.
 *
 * Screen-orientation locking isn't meaningful on web, so failures there
 * are swallowed rather than surfaced.
 */
export function usePortraitLock() {
  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    return () => {
      ScreenOrientation.unlockAsync().catch(() => {});
    };
  }, []);
}
