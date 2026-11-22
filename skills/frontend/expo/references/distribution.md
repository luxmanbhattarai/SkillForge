# Distribution: updates, push, and web output

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
