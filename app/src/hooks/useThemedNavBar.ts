import { useEffect } from "react";
import { Platform } from "react-native";
import { NavigationBar } from "expo-navigation-bar";

/**
 * Sets the Android navigation bar's icon/button style to match the app's
 * fixed dark theme (light icons, since expo-navigation-bar's "dark" style
 * means a dark bar with light content). This is a one-time, app-wide
 * setting — unlike useImmersiveNavBar's per-screen show/hide, there's no
 * per-screen variant to restore on unmount. No-op off Android.
 */
export function useThemedNavBar() {
  useEffect(() => {
    if (Platform.OS !== "android") return;
    NavigationBar.setStyle("dark");
  }, []);
}
