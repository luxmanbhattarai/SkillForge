---
name: expo
description: >
  Build, test, and ship universal iOS, Android, and web apps with Expo
  SDK 58 and Expo Router. Use when creating an Expo project, choosing
  between Expo Go and development builds, configuring EAS Build,
  Update, and Submit, writing config plugins, adding push
  notifications with expo-notifications, handling over-the-air
  updates, or deploying to the App Store and Google Play.
license: MIT
metadata:
  version: "1.0.0"
  category: frontend
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
compatibility: Requires Node.js 22.13+, 24.3+, or 26+ (odd-numbered releases unsupported) and an Expo account for EAS cloud builds, updates, and submissions.
---

# Expo

## Purpose

This skill builds universal React Native apps with Expo: one TypeScript
codebase for iOS, Android, and web, file-based routing with Expo Router,
native capabilities through the Expo SDK, and cloud delivery through
Expo Services (EAS) — builds, store submissions, and
over-the-air updates. It covers the managed workflow from first run to
a store release.

## When to Use

- Creating a new Expo project or adding screens and features to one.
- Choosing between Expo Go and a development build.
- Adding navigation with Expo Router (stacks, tabs, modals, deep links).
- Using Expo SDK modules: camera, notifications, secure storage,
  file system, sensors, authentication.
- Writing config plugins or running `expo prebuild` for custom native
  configuration.
- Setting up EAS Build profiles, EAS Update channels, or EAS Submit.
- Adding push notifications or over-the-air updates.
- Shipping to TestFlight, the App Store, or Google Play.

## When Not to Use

- A bare React Native project that already manages its own
  `android/` and `ios/` directories and does not use Expo modules:
  use `react-native`.
- A web-only app: use `react`, `nextjs`, or `astro`.
- A fully native Swift/Kotlin app: no skill in this library covers that.
- Backend APIs or server logic beyond Expo Router API routes: use a
  backend skill such as `express`, `fastify`, or `nestjs`.

## Prerequisites

- Node.js 22.13 or newer on the 22 line, 24.3 or newer on the 24
  line, or Node.js 26 and later (the SDK 58 tooling requirement;
  odd-numbered releases such as 23 and 25 are not supported).
- An Expo project on SDK 58 (current stable as of 2026-11-20,
  released 2026-10-15; built for iOS 27 and ships React Native
  0.88). SDK 57 (React Native 0.86) is the previous release. New
  projects are created with `npx create-expo-app@latest`, which
  prompts for the SDK version — pick the latest.
- An Expo account for EAS builds, updates, and submissions, and for
  running on a physical iOS device with Expo Go.
- Familiarity with `react` and `typescript`; the default template
  includes TypeScript and Expo Router.
- Apple Developer ($99/year) and Google Play ($25 one-time) accounts
  for store submission; TestFlight and internal testing need them too.

## Official Documentation

- [Create a project](https://docs.expo.dev/get-started/create-a-project/) —
  scaffolding a new Expo app and its system requirements.
- [Expo tutorial: create your first app](https://docs.expo.dev/tutorial/create-your-first-app/) —
  the guided walkthrough, updated for SDK 58.
- [Expo SDK 58 changelog](https://expo.dev/changelog/sdk-58) — what
  changed in the current SDK, including breaking changes.
- [Expo Services (EAS)](https://docs.expo.dev/eas/) — Expo Build,
  Submit, Update, Hosting, and Workflows.
- [EAS CLI reference](https://docs.expo.dev/eas/cli/) — every `eas`
  command and flag.
- [Expo Router introduction](https://expo.github.io/router/docs/intro/) —
  file-based routing for universal apps.
- [Using push notification services](https://docs.expo.dev/guides/using-push-notifications-services/) —
  Expo push, FCM, APNs, and third-party providers.

## Required Workflow

1. Create the project with `npx create-expo-app@latest` and pick the
   latest SDK; use the default template (Expo Router + TypeScript)
   unless the app genuinely needs no navigation.
2. Decide the runtime before writing features: Expo Go for quick
   prototyping, or a development build (`expo-dev-client`) as soon
   as the app needs custom native code, push notifications, or
   config plugins. Do not design around Expo Go limitations for a
   production app.
3. Map routes in the `app/` directory first: layouts, tabs, stacks,
   modals, and dynamic segments. Every file in `app/` is a route —
   keep non-route code in `components/` or `src/` outside `app/`.
4. Install SDK modules with `npx expo install <package>` so versions
   stay aligned with the SDK; never hand-pick versions for Expo
   packages.
5. Configure app metadata and permissions in `app.json` /
   `app.config.js` (name, slug, scheme, icons, splash, permissions);
   native projects are generated from this config, so it is the
   single source of truth.
6. Set up EAS early: `eas build:configure` to create `eas.json` with
   `development`, `preview`, and `production` profiles, and link the
   project to an EAS account.
7. Test on a real device (development build) for anything involving
   native behavior: permissions, camera, notifications, deep links.
8. Ship through EAS: build with `eas build`, submit with
   `eas submit` (or `--auto-submit`), and publish JavaScript-only
   fixes with `eas update` on the matching channel.

## Implementation Standards

- SDK 58 is the current stable line as of 2026-11-20. Keep the
  project on the latest SDK; upgrade one SDK at a time with
  `npx expo install expo@^<sdk>.0.0 --fix` followed by
  `npx expo-doctor@latest`, and read the changelog's breaking
  changes before upgrading.
- Expo Router: routes are files under `app/`; `_layout.tsx` files
  define navigators; `(group)` folders organize routes without
  affecting the URL; `[id].tsx` is a dynamic segment;
  `[...rest].tsx` is a catch-all. Navigate with `Link` or the
  `useRouter` hook. Enable typed routes
  (`experiments.typedRoutes`) so `href` values are checked.
- API routes (`+api.ts` files) run server-side and need a server
  target; with `static` web output they require `apiRoutes: true`
  in the `expo-router` config plugin (SDK 58 and later).
- Config plugins: declare them in the `plugins` array of the app
  config. Prefer first-party plugins; a custom plugin must be
  minimal, version-pinned, and tested with `npx expo prebuild`
  before it is committed.
- Continuous Native Generation: never hand-edit `android/` or
  `ios/` in a managed project. If native projects exist on disk,
  regenerate them with `npx expo prebuild` after config changes
  instead of patching generated files.
- Environment variables: `EXPO_PUBLIC_` variables are inlined into
  the JavaScript bundle at build time and must never hold secrets.
  Server-side and build-time secrets belong in EAS environment
  variables, selected with the `--environment` flag on `eas`
  commands (required for `eas update` since SDK 55).
- State and data: local state with React hooks; shared client state
  with a small store; server state with TanStack Query or `fetch`
  in a typed API layer. The same rules as `react-native` apply —
  every screen handles loading, empty, error, and offline states.
- Updates: EAS Update delivers JavaScript and asset changes
  over the air. Native code, SDK, or config-plugin changes always
  need a new build. Publish updates to a channel that matches the
  build's channel, and sign updates with code signing so only your
  updates can be applied.
- Push notifications: use `expo-notifications`. Remote push
  requires a development build (it is unavailable in Expo Go on
  Android from SDK 53). Register the Expo push token with
  `getExpoPushTokenAsync({ projectId })`, send it to your server,
  and send through the Expo Push Service or directly via FCM/APNs.
- Web output: choose the `web.output` target deliberately —
  `single` (SPA), `static` (prerendered pages), or `server`
  (per-request rendering with API routes) — and deploy the matching
  artifacts.

### Accessibility

- Every interactive element gets an accessible name and role:
  `accessibilityLabel`, `accessibilityRole`, and
  `accessibilityState` on pressables. Images that convey meaning
  get `accessibilityLabel`; decorative images get
  `accessible={false}` so screen readers skip them.
- Respect system settings: honor reduced motion and do not disable
  font scaling (`allowFontScaling={false}`) except where the
  layout genuinely breaks.
- Touch targets are at least 44x44 points. Test with VoiceOver on
  iOS and TalkBack on Android, not only visually.

### Testing Strategy

- Test on a real device with a development build for anything
  involving native behavior: Expo Go does not reproduce it
  (remote push is unavailable in Expo Go on Android from SDK
  53), and a simulator hides device-only failures.
- Test config plugins with `npx expo prebuild` before
  committing: a broken plugin fails the prebuild, and a
  prebuild that succeeds proves the native projects regenerate
  cleanly.
- Test OTA updates on a preview build before publishing to the
  production channel: the update applies, the app restarts into
  the new bundle, and the channel matches the build's channel.
- Test navigation with typed routes enabled: every `href` is
  checked at build time, and a link to a removed route is a
  compile error instead of a runtime dead end.
- Test after each SDK upgrade: run `npx expo-doctor@latest` and
  exercise the app's key flows on a development build before
  starting the next SDK upgrade.

## Best Practices

- Start every production app with a development build, not Expo Go:
  it matches the shipped app, supports push notifications and
  custom native code, and avoids re-testing everything later.
- Keep `app.json` minimal and move environment-specific values into
  `app.config.js` only when they genuinely vary per environment.
- Use `expo-doctor` after installs and upgrades; it catches version
  drift between the SDK and installed packages before it becomes a
  runtime crash.
- Fingerprint builds: EAS reuses a compatible development build
  when the native fingerprint matches, so avoid gratuitous native
  changes during development.
- Separate build profiles cleanly: `development` (dev client,
  internal distribution), `preview` (production-like, internal,
  `.apk` on Android for sideloading), `production` (store
  artifacts: `.ipa` and `.aab`).
- Test OTA updates on a preview build before publishing to the
  production channel; a bad update ships to every installed app.
- Use `expo-image` for remote images: it caches, resizes, and
  avoids the memory cost of the built-in `Image` in lists.
- Handle permissions gracefully: explain why before requesting,
  handle denial with a settings deep link, and never crash when a
  permission is missing.

## Security Considerations

- `EXPO_PUBLIC_` variables ship in the bundle: never put API keys,
  tokens, or secrets in them. Anything the client must not see
  stays on a server or in EAS secrets used only at build time.
- EAS credentials (distribution certificates, provisioning
  profiles, keystores) are managed by Expo or stored locally with
  restricted access; never commit them to the repo.
- Validate deep link URLs before navigating: check the scheme and
  parameters, and never trust link content to authorize actions.
- Sign OTA updates with code signing so a compromised update
  channel cannot push arbitrary JavaScript to installed apps.
- Store auth tokens with `expo-secure-store` (Keychain/Keystore
  backed), never in `AsyncStorage` or plain files.
- Push notification payloads travel through third-party services:
  never put sensitive content (passwords, full messages with
  private data) in a notification body.
- Keep the SDK current: old SDKs lose security fixes, and the App
  Store and Google Play raise minimum target SDK requirements over
  time.
- API routes and any server code must validate input and authorize
  every request; client-side checks are not a security boundary.

## Performance Considerations

- Bundle size: audit dependencies with the Metro bundle report;
  each native module adds binary size and startup cost. Prefer
  Expo SDK modules over heavier third-party equivalents.
- Startup: defer non-essential work (analytics init, remote config)
  until after the first screen renders; keep the root layout lean.
- Lists: virtualize with `FlatList`, memoize rows, and use
  `expo-image` for remote images in lists.
- EAS Build: use build caching and avoid changing native
  dependencies unnecessarily — each change invalidates the cache
  and lengthens the build.
- OTA updates: keep update payloads small by avoiding large assets
  in the JavaScript bundle; host media on a CDN instead.
- Web: pick the `static` output for content-heavy sites so pages
  are prerendered; use `server` output only when per-request
  rendering is needed.
- Hermes is the default engine; keep it enabled and stay on the
  current SDK for engine fixes.

## Common Mistakes

- Developing against Expo Go and discovering late that push
  notifications or a native module needs a development build —
  start with a dev build for production apps.
- Hand-editing `android/` or `ios/` in a managed project — the
  changes are lost on the next `expo prebuild`. Put the change in
  the app config or a config plugin.
- Installing Expo packages with plain `npm install` — version drift
  against the SDK causes runtime errors. Always use
  `npx expo install`.
- Putting a helper component inside `app/` — every file there is a
  route, so it becomes a reachable screen. Keep components outside
  `app/`.
- Publishing an OTA update after a native change — the update
  cannot change native code, and the app may crash or silently
  misbehave. Native changes need a new build.
- Shipping secrets in `EXPO_PUBLIC_` variables — they are inlined
  into the bundle and readable by anyone.
- Skipping `expo-doctor` after an upgrade — mismatched SDK package
  versions surface as confusing native crashes.
- Testing push notifications only in Expo Go — remote push does not
  work there on Android from SDK 53; test on a development build
  on a physical device.
- Forgetting that iOS internal builds only install on devices
  registered in the provisioning profile at build time — add testers
  before building, or re-sign with `eas build:resign`.

## Examples

Root layout with a stack navigator (Expo Router):

```tsx
// app/_layout.tsx
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Articles' }} />
      <Stack.Screen name="article/[id]" options={{ title: 'Article' }} />
    </Stack>
  );
}
```

Registering for push notifications (development build required):

```tsx
import { useEffect, useState } from 'react';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';

async function registerForPushNotifications(): Promise<string | null> {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return null;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (typeof projectId !== 'string') return null;
  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  return token.data;
}

export function usePushToken() {
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    registerForPushNotifications().then(setToken);
  }, []);
  return token;
}
```

EAS build profiles (`eas.json`):

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "production": {}
  }
}
```

## Validation Checklist

- [ ] The app starts on the latest SDK with `npx expo start` and
      `npx expo-doctor@latest` reports no issues.
- [ ] A development build installs and runs on a physical device
      for each target platform.
- [ ] Every file under `app/` is an intentional route; components
      live outside `app/`.
- [ ] No secrets appear in `EXPO_PUBLIC_` variables, the app config,
      or committed files; tokens use `expo-secure-store`.
- [ ] `eas.json` defines `development`, `preview`, and `production`
      profiles; a preview build was tested before any production
      release.
- [ ] Push notifications (if used) were tested on a development
      build on a physical device, including the denied-permission
      path.
- [ ] OTA updates (if used) were tested on a preview build, on the
      correct channel, before publishing to production.
- [ ] Deep links open the right screen from a cold start and from a
      running app.

## Expected Deliverables

- An Expo SDK 58 app following the standards above, with typed
  routes and a typed API layer.
- `eas.json` profiles and a documented path from development build
  to store submission.
- A release or preview build verified on a physical device, with
  the submission steps noted.
- A short note on update strategy: what ships as an OTA update and
  what requires a new build.

## References

- [Create a project](https://docs.expo.dev/get-started/create-a-project/) —
  scaffolding and system requirements.
- [Expo tutorial: create your first app](https://docs.expo.dev/tutorial/create-your-first-app/) —
  guided walkthrough for SDK 58.
- [Expo SDK 58 changelog](https://expo.dev/changelog/sdk-58) — current
  SDK changes and breaking changes.
- [Expo Services (EAS)](https://docs.expo.dev/eas/) — Build, Submit,
  Update, Hosting, Workflows.
- [EAS CLI reference](https://docs.expo.dev/eas/cli/) — commands
  and flags.
- [Expo Router introduction](https://expo.github.io/router/docs/intro/) —
  file-based routing.
- [Using push notification services](https://docs.expo.dev/guides/using-push-notifications-services/) —
  push options and setup.
- Related skills in this repository: `react-native`, `react`,
  `typescript`, `accessibility`, `frontend-performance`.
