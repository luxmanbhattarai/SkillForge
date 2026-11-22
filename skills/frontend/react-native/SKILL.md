---
name: react-native
description: >
  Build native iOS and Android apps with React Native 0.88 using
  TypeScript, the New Architecture, and Hermes. Use when creating or
  editing a bare React Native app, adding navigation with React
  Navigation, managing state, fetching data, writing native modules,
  styling with StyleSheet, optimizing FlatList performance, adding
  accessibility, testing with Jest and React Native Testing Library,
  or shipping release builds to the App Store and Google Play.
license: MIT
metadata:
  version: "1.0.0"
  category: frontend
  maintainer: skills-library
  source: original
  last_verified: "2026-11-22"
compatibility: Requires Node.js 22 LTS; Xcode on macOS for iOS builds and Android Studio for Android builds.
---

# React Native

## Purpose

This skill builds native iOS and Android apps with React Native using the
Community CLI (the "bare" workflow): TypeScript components rendered as
native views, navigation with React Navigation, server state with a data
fetching library, and custom native code where the platform demands it.
It covers the full loop from project setup to signed release builds in
the App Store and Google Play.

## When to Use

- Creating a new bare React Native app or adding screens and features
  to an existing one.
- Adding navigation, deep linking, or tab and stack navigators.
- Managing local, shared, or server state in a mobile app.
- Fetching data from an API with loading, error, and offline states.
- Writing or wrapping a native module (Kotlin/Swift) for platform APIs.
- Styling screens, building lists, or fixing layout on iOS and Android.
- Improving startup time, list scrolling, or bundle size.
- Testing components and flows, or shipping a release build.

## When Not to Use

- Starting a new app where managed tooling, cloud builds, and OTA
  updates are wanted: use `expo` — the React Native team recommends a
  framework such as Expo for most new projects.
- A web-only app: use `react` or `nextjs`.
- A fully native app written in Swift or Kotlin with no shared UI code:
  no skill in this library covers that.
- Styling a web app: use `css`, `tailwind-css`, or `shadcn-ui`.

## Prerequisites

- Node.js 22 LTS or newer installed. React Native 0.84 and later
  require Node.js v22.11 or newer; do not assume a minor version.
- A React Native 0.88 project (current stable,
  released 2026-10-19; ships React 19.3 and Metro 0.87). Versions
  0.85.x and earlier are unsupported. New projects are created with
  `npx @react-native-community/cli@latest init <Name>`.
- Xcode (macOS only) for iOS builds and Android Studio with the
  Android SDK for Android builds; the environment setup guide lists
  the exact SDK and JDK versions.
- Familiarity with `react` and `typescript`; new projects use
  TypeScript by default.
- The app's distribution decided (internal testing, TestFlight /
  internal track, or public stores) because it affects signing and
  build configuration.

## Official Documentation

- [Get Started Without a Framework](https://reactnative.dev/docs/getting-started-without-a-framework) —
  creating a bare app with the Community CLI and running it.
- [Environment setup](https://reactnative.dev/docs/environment-setup/) —
  the exact Xcode, Android Studio, SDK, and JDK versions required.
- [React Native 0.88 release notes](https://reactnative.dev/blog/2026/10/19/react-native-0.88) —
  what changed in the current stable release.
- [React Navigation getting started](https://reactnavigation.org/docs/7.x/getting-started/) —
  the standard navigation library, current 7.x line.
- [React documentation](https://react.dev/) — components, hooks, and
  state concepts that React Native builds on.

## Required Workflow

1. Confirm the project is a bare React Native app (it has `android/`
   and `ios/` directories managed in the repo). If it is an Expo
   project, use `expo` instead.
2. Confirm the React Native version in `package.json` and check the
   official release notes when the version matters; upgrade with the
   Upgrade Helper rather than by hand-editing native files.
3. Map the navigation structure first: stacks, tabs, modals, and deep
   links, with one navigator tree owned by a single
   `NavigationContainer` (or the static navigation API).
4. Decide where each piece of state lives before writing screens:
   local component state, shared client state, or server state
   (cached API data).
5. Build screens as small components: one screen component per route,
   presentational components under it, data fetching in a hook or a
   data layer, never inline in JSX.
6. Handle every screen's loading, empty, error, and offline states;
   mobile networks drop, and a spinner with no error path is a bug.
7. Test on a real device or emulator for each platform touched:
   layout, gestures, keyboard behavior, and safe areas differ between
   iOS and Android.
8. Run the release build (`./gradlew bundleRelease`, Xcode archive)
   before calling the work done; debug builds hide signing, ProGuard,
   and Hermes issues.

## Implementation Standards

- The New Architecture (Fabric renderer and TurboModules) is the
  default in current releases. Do not add legacy-architecture flags
  or bridge-era workarounds to new code.
- Hermes is the default JavaScript engine. Do not switch engines
  without a measured reason.
- TypeScript everywhere: type props, navigation params (declare a
  param list type per navigator), and API responses. Validate API
  payloads at runtime before rendering them.
- Building the app — React Navigation 7, state, data fetching,
  lists, styling, images: see
  [references/app-building.md](./references/app-building.md).
- Native and platform — TurboModules, `Platform.select`, secrets:
  see [references/native-and-platform.md](./references/native-and-platform.md).

### Accessibility

- Every interactive element gets an accessible name and role:
  `accessibilityLabel`, `accessibilityRole`, `accessibilityHint`,
  and `accessibilityState`; group related elements with
  `accessible` so screen readers announce them as one item.
- Respect system settings: honor Dynamic Type / font scaling and
  reduced motion; never disable font scaling globally.
- Touch targets are at least 44x44 points. Test with VoiceOver on
  iOS and TalkBack on Android, not only visually.

### Testing Strategy

- Test components with React Native Testing Library and Jest:
  render each screen in loading, empty, error, and offline
  states, and assert on what the user sees rather than on
  implementation details.
- Test navigation with the static configuration: deep links
  resolve to the right screen with typed params, and a link to
  a removed route fails loudly instead of landing nowhere.
- Test the API layer with mocked responses: non-OK statuses,
  network failure, and cancellation on unmount are all handled,
  and invalid payloads are rejected before rendering.
- Test lists with long data: `FlatList` renders only the
  visible window, `keyExtractor` returns stable ids, and
  scrolling does not remount rows or lose scroll position.
- Test native modules on both platforms: each TurboModule is
  exercised on iOS and Android, errors surface as typed
  rejections rather than crashes, and platform differences go
  through one `Platform.select` per component.

## Best Practices

- Keep the JavaScript thread free: expensive work (parsing, crypto,
  image processing) belongs in a native module or a background
  library, not in a render or an event handler.
- Memoize list rows (`React.memo`) and keep `renderItem` stable; a
  list that re-renders every row on each keystroke scrolls badly.
- Use `Pressable` for touchables; it gives press state and works
  consistently across platforms.
- Design for offline first where the app reads data: cache with
  TanStack Query persistence or a local database, and queue mutations
  for retry.
- Deep links: define a linking configuration with prefixes and a
  route map, and test both cold-start and warm deep links on each
  platform.
- Keep the app launch path lean: defer non-essential initialization
  (analytics, feature flags) until after the first screen renders.
- Log with levels and a crash reporter in release builds; `console`
  output is invisible in production.
- Version the app deliberately: `versionName`/`CFBundleShortVersionString`
  for users, `versionCode`/`CFBundleVersion` incremented on every
  store submission.

## Security Considerations

- The JavaScript bundle ships to every user and is trivially
  readable: it must never contain secrets, private keys, or
  admin credentials. Hermes bytecode is not obfuscation.
- Store tokens in the Keychain (iOS) or Keystore (Android), never in
  `AsyncStorage`, which is unencrypted plain storage.
- Use HTTPS for all network traffic; on Android do not enable
  cleartext traffic, and on iOS do not weaken App Transport Security
  without a documented reason. Consider certificate pinning for
  high-sensitivity APIs, with a plan for certificate rotation.
- Validate deep link URLs before acting on them: check the scheme,
  host, and parameters, and never execute navigation or actions from
  untrusted link content without validation.
- Treat every API response as untrusted input: validate shapes at
  runtime, and never render raw HTML from a server without a
  sanitizer.
- Enable release hardening: ProGuard/R8 code shrinking on Android,
  and strip debug symbols from release builds. Do not ship a release
  build with the dev menu or debug logging enabled.
- Biometric and device-lock checks are authentication UX, not a
  substitute for server-side authorization on every request.

## Performance Considerations

- Startup time is dominated by native initialization and the
  JavaScript bundle: keep dependencies lean, defer optional native
  modules, and measure with the React Native DevTools profiler
  rather than guessing.
- Lists are the most common performance problem: virtualize with
  `FlatList`, keep rows pure and memoized, set `getItemLayout` for
  fixed-height rows, and tune `windowSize` and `maxToRenderPerBatch`
  only after profiling.
- Images: serve correctly sized images, cache remote images, and
  avoid re-decoding large images on every render.
- Avoid re-rendering whole screens on high-frequency updates
  (text input, sensors, animations): colocate state, split
  components, and drive animations on the native thread with
  Reanimated or the Animated API with `useNativeDriver: true`
  where the property supports it.
- Bundle size: audit native dependencies — each one adds native code
  and startup cost. Remove unused libraries instead of leaving them
  linked.
- Hermes reduces startup time and memory versus the older engine;
  keep it enabled and keep the app on the current stable release
  to benefit from engine fixes.

## Common Mistakes

- `ScrollView` for a long or unbounded list — renders every row at
  once and kills memory and scroll performance. Use `FlatList`.
- Storing auth tokens in `AsyncStorage` — unencrypted and readable.
  Use Keychain/Keystore-backed secure storage.
- Fetching in render or in an event handler without cleanup —
  duplicate requests and state updates after unmount. Fetch in an
  effect or a query hook with cancellation.
- Using array index as a list `key` — reordering or deleting items
  corrupts row state. Use a stable id.
- Hardcoding insets for notches and home indicators — breaks on the
  next device. Use safe-area insets.
- Ignoring the Android back button and hardware keyboard —
  navigation and forms must handle both.
- Shipping a debug build to testers — hides release-only crashes
  from ProGuard, Hermes, and signing. Always test the release build.
- Putting secrets in the bundle or in `Info.plist` / `AndroidManifest`
  values — they ship to users. Keep secrets server-side or in secure
  storage.
- Blocking the JavaScript thread with synchronous work — the whole
  UI freezes. Move heavy work off the thread.

## Examples

Screen with a typed list, data fetching, and accessibility props:

  [examples/article-screen.tsx](./examples/article-screen.tsx).

Static navigation configuration (React Navigation 7):

  [examples/static-navigation.tsx](./examples/static-navigation.tsx).

## Validation Checklist

- [ ] The app runs from a clean checkout on the target platform(s)
      (`npm run ios` / `npm run android`).
- [ ] TypeScript compiles with no errors and navigation params are typed.
- [ ] Every screen renders loading, empty, error, and offline states.
- [ ] Lists use `FlatList`/`SectionList` with stable keys.
- [ ] No secrets appear in JavaScript, native source, or build config
      committed to the repo; tokens use secure storage.
- [ ] Touch targets are at least 44x44 points and interactive
      elements expose accessibility labels and roles.
- [ ] The release build installs and runs on a real device; the debug
      build was not the only one tested.
- [ ] Deep links open the right screen from a cold start and from a
      running app.

## Expected Deliverables

- A bare React Native app or feature following the standards above,
  with typed navigation and a typed API layer.
- Screens that render loading, empty, error, and offline states.
- A release build verified on a real device, with the signing and
  versioning steps noted.
- A short note on where state lives (local, shared, server) and why.

## References

- [Get Started Without a Framework](https://reactnative.dev/docs/getting-started-without-a-framework) —
  bare app setup with the Community CLI.
- [Environment setup](https://reactnative.dev/docs/environment-setup/) —
  required toolchains per platform.
- [React Native 0.88 release notes](https://reactnative.dev/blog/2026/10/19/react-native-0.88) —
  current stable release.
- [React Navigation getting started](https://reactnavigation.org/docs/7.x/getting-started/) —
  navigation for bare apps.
- [React documentation](https://react.dev/) — components and hooks.
- Related skills in this repository: `expo`, `react`, `typescript`,
  `accessibility`, `frontend-performance`, `unit-testing`.
