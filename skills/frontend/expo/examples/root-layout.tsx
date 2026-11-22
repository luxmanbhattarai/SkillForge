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
