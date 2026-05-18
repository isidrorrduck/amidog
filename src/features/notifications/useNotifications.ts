import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  getUnreadNotificationsCount,
  listNotifications,
  markNotificationRead,
  registerPushToken,
} from './notificationsService';
import type { PushTokenRegistrationInput } from './types';

export const notificationsQueryKeys = {
  all: ['notifications'] as const,
  byKennel: (kennelId: string | null | undefined) => [...notificationsQueryKeys.all, kennelId] as const,
  unreadCount: (kennelId: string | null | undefined) =>
    [...notificationsQueryKeys.byKennel(kennelId), 'unread-count'] as const,
};

export function useNotifications(kennelId: string | null | undefined) {
  return useQuery({
    queryKey: notificationsQueryKeys.byKennel(kennelId),
    queryFn: () => requireKennelId(kennelId).then((id) => listNotifications(id)),
    enabled: Boolean(kennelId),
  });
}

export function useUnreadNotificationsCount(kennelId: string | null | undefined) {
  return useQuery({
    queryKey: notificationsQueryKeys.unreadCount(kennelId),
    queryFn: () => requireKennelId(kennelId).then((id) => getUnreadNotificationsCount(id)),
    enabled: Boolean(kennelId),
  });
}

export function useMarkNotificationRead(kennelId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) =>
      requireKennelId(kennelId).then((id) => markNotificationRead(id, notificationId)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationsQueryKeys.byKennel(kennelId) });
    },
  });
}

export function useRegisterPushToken() {
  return useMutation({
    mutationFn: (input: PushTokenRegistrationInput) => registerPushToken(input),
  });
}

async function requireKennelId(kennelId: string | null | undefined) {
  if (!kennelId) {
    throw new Error('Selecciona un criadero antes de gestionar notificaciones.');
  }

  return kennelId;
}
