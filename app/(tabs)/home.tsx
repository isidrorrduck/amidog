import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { Button, Card, Screen } from '../../src/components';
import { useAuth } from '../../src/features/auth';
import { useCurrentKennel } from '../../src/features/kennels';
import { useUnreadNotificationsCount } from '../../src/features/notifications';

const baseSections = [
  { title: 'Breeders', body: 'Manage kennels and breeder profiles.', href: '/breeders' },
  { title: 'Dogs', body: 'Keep the dog registry ready for future data.', href: '/dogs' },
  { title: 'Clients', body: 'Manage client contacts and placement notes.', href: '/clients' },
  { title: 'Litters', body: 'Prepare the workspace for litters and puppies.', href: '/litters' },
  { title: 'Puppies', body: 'Manage puppies by litter, status and placement notes.', href: '/puppies' },
  { title: 'Reservations', body: 'Track puppy bookings, deposits and placement status.', href: '/reservations' },
  { title: 'Documents', body: 'Store contracts, pedigrees, vaccines and veterinary files.', href: '/documents' },
  { title: 'Promotions', body: 'Manage campaigns, recommendations and commercial messages.', href: '/promotions' },
] as const;

export default function HomeScreen() {
  const { profile, profileError } = useAuth();
  const { currentKennel, kennelError } = useCurrentKennel();
  const unreadNotificationsQuery = useUnreadNotificationsCount(currentKennel?.id);
  const workspaceName = currentKennel?.name ?? 'Kennel workspace';
  const unreadCount = unreadNotificationsQuery.data ?? 0;
  const sections = [
    ...baseSections,
    {
      title: 'Notifications',
      body:
        unreadCount > 0
          ? `${unreadCount} unread ${unreadCount === 1 ? 'notification' : 'notifications'}`
          : 'Review promotion alerts and kennel updates.',
      href: '/notifications',
    },
  ] as const;

  return (
    <Screen scrollable>
      <View className="gap-2 pb-4">
        <Text className="text-3xl font-bold text-slate-950">{workspaceName}</Text>
        <Text className="text-base leading-6 text-slate-600">
          {profile?.email ? `Signed in as ${profile.email}` : 'A clean starting point for multi-tenant kennel management.'}
        </Text>
      </View>

      {profileError || kennelError ? (
        <Card title="Workspace setup">
          <Text className="text-sm leading-5 text-red-600">{profileError ?? kennelError}</Text>
        </Card>
      ) : null}

      <View className="gap-3">
        {sections.map((section) => (
          <Card key={section.href} title={section.title}>
            <Text className="mb-4 text-sm leading-5 text-slate-600">{section.body}</Text>
            <Button title={`Open ${section.title}`} onPress={() => router.push(section.href as never)} />
          </Card>
        ))}
      </View>
    </Screen>
  );
}
