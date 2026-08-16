import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ClipLibraryProvider } from "@/data/ClipLibraryContext";
import { PlaybackSessionProvider } from "@/state/PlaybackSessionContext";
import { useThemedNavBar } from "@/hooks/useThemedNavBar";
import { color } from "@/theme";

export default function RootLayout() {
  useThemedNavBar();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ClipLibraryProvider>
        <PlaybackSessionProvider>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: color.bg },
            }}
          />
        </PlaybackSessionProvider>
      </ClipLibraryProvider>
    </GestureHandlerRootView>
  );
}
