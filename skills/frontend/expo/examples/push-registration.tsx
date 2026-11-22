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
