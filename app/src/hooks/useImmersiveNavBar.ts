import { useEffect } from "react";
import { Platform } from "react-native";
import { NavigationBar } from "expo-navigation-bar";

/**
 * Hides the Android navigation bar while the calling screen is mounted.
 * expo-navigation-bar's setHidden always hides via
 * BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE (the modern equivalent of
 * "immersive sticky"), so swiping from the edge it lives on — the bottom
 * in portrait, the side it's docked to in landscape — temporarily reveals
 * it before it auto-hides again. Restores visibility on unmount. No-op
 * off Android, where this system UI model doesn't apply.
 */
export function useImmersiveNavBar() {
  useEffect(() => {
    if (Platform.OS !== "android") return;
    NavigationBar.setHidden(true);
    return () => {
      NavigationBar.setHidden(false);
    };
  }, []);
}
