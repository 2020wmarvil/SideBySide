# Side By Side

A mobile app for comparing two videos of a trick — martial arts, gymnastics, any physical skill — side by side or overlaid, so you can study form, timing, and progress across attempts.

## Repo layout

- **`app/`** — the real app: React Native (Expo), TypeScript.
- **`prototype/`** — the original interactive design mockup this was built from (a `claude.ai/design` "design canvas" file — `Trick Comparer.dc.html`, plus its stylesheet and runtime). Kept for reference, not part of the shipped app.

## Running it

```bash
cd app
npm install
npx expo start
```

Scan the QR code with [Expo Go](https://expo.dev/go) on an Android device — Android is the target platform. `npx expo start --web` also works for iterating on most screens in a browser, though camera recording and native gestures need a real device.

## What it does

**Playback** is the core screen. Load a clip into the left and right slots, trim each independently by dragging the in/out handles or scrubbing the track, set playback speed (0.1–1×), and zoom (slider or pinch) and pan (drag) each clip to frame the trick. Lock the timeline to play, scrub, step, and pan both clips together, looping at the shorter of the two windows. Switch between side-by-side and overlay display — overlay adds an opacity slider and a top/bottom swap — or swap which clip is on the left vs. right entirely. Jump between tagged "tries" of the same trick, or record a new attempt that replaces a slot in place. The screen locks to landscape and hides the Android navigation bar while active (swipe from the edge it's docked to reveal it).

**Library** lists every imported or recorded clip, searchable and filterable by tag, with a layout that adapts between a persistent sidebar (wide/landscape) and a stacked filter bar (narrow/portrait). Tap a clip to load it into the left or right slot.

**Import** picks a video from local device storage and tags it, with autocomplete drawn from tags you've already used, before adding it to the library.

**Record** captures a new clip in-app, with two entry points that behave differently: from Playback's Replace button, the take replaces that slot's clip in place, inheriting its tags, and drops you back into Playback with pan/zoom untouched; from Library, a new take has no clip to inherit tags from, so it goes through the same tagging step as Import before landing in the library.

## Tech

Expo SDK 57 (React 19 / React Native 0.86), TypeScript, file-based routing via `expo-router`. Video playback via `expo-video`, in-app recording via `expo-camera`, device picking via `expo-image-picker`, gestures via `react-native-gesture-handler`. The clip library is a flat JSON list in `AsyncStorage` (`app/src/data/clipRepository.ts`) — no backend, everything lives on-device.

```
app/src/
  app/            screens, one file per route (expo-router)
  components/     playback/, library/, shared/
  data/           clip repository, recordings, seed data, ClipLibraryContext
  state/          PlaybackSessionContext (per-slot trim/speed/zoom/pan)
  hooks/          video player, duration, thumbnail, gesture-adjacent hooks
  lib/            small pure helpers (formatting, etc.)
```

## Status

The app icon now uses real artwork (iOS light/tinted variants, Android adaptive icon layers, web favicon); the splash screen is still Expo's stock template asset. Everything else is implemented and has been exercised on an Android device; if something feels off in a specific interaction, it's worth a closer look rather than assumed-working.
