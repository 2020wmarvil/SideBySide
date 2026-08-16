import { useEffect } from "react";
import * as ScreenOrientation from "expo-screen-orientation";

/**
 * Allows the screen to rotate freely (portrait or landscape) while the
 * calling screen is mounted, restoring the default (portrait, per
 * app.json) on unmount. Record uses this so the camera preview can be
 * framed in either orientation — see record.tsx for how it locks down to
 * a single orientation for the duration of an actual take.
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
