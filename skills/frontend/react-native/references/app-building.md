# Building the app: navigation, state, data, lists, styling, images

- Navigation: React Navigation 7.x. Prefer the static configuration
  API (`createStaticNavigation`) for new navigators; it gives typed
  routes and deep linking from one configuration object. Use the
  native stack navigator (`@react-navigation/native-stack`) for
  platform-native transitions. Keep exactly one navigation container
  at the app root.
- State: `useState`/`useReducer` for local state; a small store
  library (Zustand is the common choice) for shared client state;
  TanStack Query for server state (caching, retries, background
  refetch). Do not duplicate server data into a client store.
- Data fetching: fetch through a typed API layer, not ad-hoc `fetch`
  calls in components. Every request handles non-OK statuses, network
  failure, and cancellation on unmount.
- Lists: `FlatList` or `SectionList` for anything that can grow;
  `ScrollView` only for short, fixed content. Provide `keyExtractor`
  with a stable id, and `getItemLayout` when rows have fixed height.
- Styling: `StyleSheet.create` for static styles; avoid creating
  style objects inside render. Respect safe areas with
  `react-native-safe-area-context`, not hardcoded insets.
- Images: always set explicit dimensions or `aspectRatio`; use the
  platform-appropriate resize mode and remote image caching for
  lists. Never render full-resolution photos into small thumbnails.
