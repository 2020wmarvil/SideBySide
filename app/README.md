# Side By Side (app)

The real app. See the [repo root README](../README.md) for what it does and the overall project layout — this file is just the dev quick-start.

## Develop

```bash
npm install
npx expo start
```

Scan the QR with [Expo Go](https://expo.dev/go) on Android, or press `w` for the web preview (`npx expo start --web`) — useful for most screens, but camera recording and native gestures need a real device.

```bash
npx tsc --noEmit   # typecheck
npx expo lint      # lint
```

File-based routing via [expo-router](https://docs.expo.dev/router/introduction/): each screen is a file under `src/app/`.
