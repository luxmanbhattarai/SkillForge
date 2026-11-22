# Native modules, platform differences, secrets

- Native modules: write TurboModules (Kotlin for Android, Swift or
  Objective-C++ for iOS) behind a typed TypeScript spec. Keep native
  code minimal — one responsibility per module — and expose errors
  as typed rejections, not crashes.
- Platform differences go in `Platform.select` or `.ios.`/`.android.`
  files, decided once per component, not scattered through JSX.
- Secrets: never hardcode API keys, tokens, or credentials in
  JavaScript or native source. Tokens live in secure storage
  (iOS Keychain / Android Keystore via a maintained library such as
  `react-native-keychain`); configuration that is not secret lives in
  build config.
