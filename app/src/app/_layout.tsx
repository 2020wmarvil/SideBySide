import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ClipLibraryProvider } from "@/data/ClipLibraryContext";
import { PlaybackSessionProvider } from "@/state/PlaybackSessionContext";
import { color } from "@/theme";

export default function RootLayout() {
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
