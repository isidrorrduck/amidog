import { router } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';

import { Button, AppCard, AppScreen } from '../../components';
import { ProtectedRoute } from '../auth';
import { useCurrentKennel } from '../kennels';
import type { KennelNotification } from './types';
import { useMarkNotificationRead, useNotifications, useUnreadNotificationsCount } from './useNotifications';

export function NotificationsScreen() {
  return (
    <ProtectedRoute>
      <NotificationsContent />
    </ProtectedRoute>
  );
}

function NotificationsContent() {
  const { currentKennel } = useCurrentKennel();
  const kennelId = currentKennel?.id ?? null;
  const notificationsQuery = useNotifications(kennelId);
  const unreadCountQuery = useUnreadNotificationsCount(kennelId);
  const markNotificationReadMutation = useMarkNotificationRead(kennelId);
  const notifications = notificationsQuery.data ?? [];
  const unreadCount = unreadCountQuery.data ?? notifications.filter((notification) => !notification.read_at).length;

  return (
    <AppScreen scrollable>
      <View className="gap-2">
        <Text className="text-3xl font-bold text-slate-950">Notifications</Text>
        <Text className="text-base leading-6 text-slate-600">
          {unreadCount > 0 ? `${unreadCount} unread updates for ${currentKennel?.name ?? 'this kennel'}` : 'All updates are read'}
        </Text>
      </View>

      {notificationsQuery.isLoading ? (
        <AppCard title="Loading notifications">
          <View className="items-start">
            <ActivityIndicator color="#1d4ed8" />
          </View>
        </AppCard>
      ) : null}

      {notificationsQuery.error ? (
        <AppCard title="Unable to load notifications">
          <Text className="text-sm leading-5 text-red-600">{getErrorMessage(notificationsQuery.error)}</Text>
        </AppCard>
      ) : null}

      {!notificationsQuery.isLoading && !notificationsQuery.error && notifications.length === 0 ? (
        <AppCard title="No notifications yet">
          <Text className="text-sm leading-5 text-slate-600">New promotions and reminders will appear here.</Text>
        </AppCard>
      ) : null}

      {notifications.length > 0 ? (
        <View className="gap-3">
          {notifications.map((notification) => (
            <NotificationCard
              isMarkingRead={markNotificationReadMutation.isPending}
              key={notification.id}
              notification={notification}
              onMarkRead={() => markNotificationReadMutation.mutate(notification.id)}
              onOpenPromotion={() => {
                if (notification.promotion_id) {
                  router.push(`/promotions/${notification.promotion_id}` as never);
                }
              }}
            />
          ))}
        </View>
      ) : null}
    </AppScreen>
  );
}

interface NotificationCardProps {
  isMarkingRead: boolean;
  notification: KennelNotification;
  onMarkRead: () => void;
  onOpenPromotion: () => void;
}

function NotificationCard({ isMarkingRead, notification, onMarkRead, onOpenPromotion }: NotificationCardProps) {
  const isUnread = !notification.read_at;

  return (
    <AppCard>
      <View className="gap-3">
        <View className="gap-1">
          <View className="flex-row flex-wrap items-center gap-2">
            <Text className="text-xl font-semibold text-slate-950">{notification.title}</Text>
            {isUnread ? (
              <View className="rounded-full bg-brand-50 px-2 py-1">
                <Text className="text-xs font-semibold text-brand-700">Unread</Text>
              </View>
            ) : null}
          </View>
          <Text className="text-sm leading-5 text-slate-600">{formatDate(notification.created_at)}</Text>
        </View>

        <Text className="text-sm leading-5 text-slate-600">{notification.body}</Text>

        {notification.promotion_id || isUnread ? (
          <View className="flex-row gap-3">
            {notification.promotion_id ? (
              <Button title="Open promotion" variant="secondary" className="flex-1" onPress={onOpenPromotion} />
            ) : null}
            {isUnread ? (
              <Button
                title="Mark read"
                variant={notification.promotion_id ? 'ghost' : 'secondary'}
                loading={isMarkingRead}
                className="flex-1"
                onPress={onMarkRead}
              />
            ) : null}
          </View>
        ) : null}
      </View>
    </AppCard>
  );
}

function formatDate(value: string) {
  return value.slice(0, 10);
}

function getErrorMessage(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && typeof (error as { message?: unknown }).message === 'string'
        ? (error as { message: string }).message
        : null;

  return message ?? 'Something went wrong while loading notifications.';
}
