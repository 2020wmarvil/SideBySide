import { useEffect } from "react";
import * as ScreenOrientation from "expo-screen-orientation";

/**
 * Allows the screen to rotate freely (portrait or landscape) while the
 * calling screen is mounted, restoring the default (portrait, per
 * app.json) on unmount. The library grid and the camera preview on record
 * both work fine either way, unlike playback, which is built around a
 * fixed landscape layout (see useLandscapeLock).
 *
 * Screen-orientation locking isn't meaningful on web, so failures there
 * are swallowed rather than surfaced.
 */
export function useFreeOrientation() {
  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.ALL).catch(() => {});
    return () => {
      ScreenOrientation.unlockAsync().catch(() => {});
    };
  }, []);
}
