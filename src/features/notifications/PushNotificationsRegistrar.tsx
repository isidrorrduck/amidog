import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import type { PushTokenPlatform } from '../../types/database';
import { useAuth } from '../auth';
import { useCurrentKennel } from '../kennels';
import { useRegisterPushToken } from './useNotifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export function PushNotificationsRegistrar() {
  const { user } = useAuth();
  const { currentKennel } = useCurrentKennel();
  const registerPushTokenMutation = useRegisterPushToken();
  const [lastRegistrationKey, setLastRegistrationKey] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id || !currentKennel?.id) {
      return;
    }

    const registrationKey = `${user.id}:${currentKennel.id}`;

    if (lastRegistrationKey === registrationKey) {
      return;
    }

    let isMounted = true;
    setLastRegistrationKey(registrationKey);

    async function register() {
      try {
        const expoPushToken = await getExpoPushToken();

        if (!expoPushToken || !isMounted || !user?.id || !currentKennel?.id) {
          return;
        }

        await registerPushTokenMutation.mutateAsync({
          user_id: user.id,
          kennel_id: currentKennel.id,
          expo_push_token: expoPushToken,
          platform: getPushTokenPlatform(),
        });
      } catch (error) {
        console.warn('Unable to register push token', error);
      }
    }

    void register();

    return () => {
      isMounted = false;
    };
  }, [currentKennel?.id, lastRegistrationKey, registerPushTokenMutation, user?.id]);

  return null;
}

async function getExpoPushToken() {
  if (Platform.OS === 'web') {
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'General',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const existingPermissions = await Notifications.getPermissionsAsync();
  let finalPermissions = existingPermissions;

  if (!hasNotificationPermission(existingPermissions)) {
    finalPermissions = await Notifications.requestPermissionsAsync();
  }

  if (!hasNotificationPermission(finalPermissions)) {
    return null;
  }

  const projectId = Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
  const token = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);

  return token.data;
}

function hasNotificationPermission(settings: Notifications.NotificationPermissionsStatus) {
  return (
    settings.status === Notifications.PermissionStatus.GRANTED ||
    settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
}

function getPushTokenPlatform(): PushTokenPlatform {
  if (
    Platform.OS === 'ios' ||
    Platform.OS === 'android' ||
    Platform.OS === 'web' ||
    Platform.OS === 'windows' ||
    Platform.OS === 'macos'
  ) {
    return Platform.OS;
  }

  return 'unknown';
}
