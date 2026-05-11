import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { Button, Card, Screen } from '../../src/components';
import { useAuth } from '../../src/features/auth';

const sections = [
  { title: 'Breeders', body: 'Manage kennels and breeder profiles.', href: '/breeders' },
  { title: 'Dogs', body: 'Keep the dog registry ready for future data.', href: '/dogs' },
  { title: 'Litters', body: 'Prepare the workspace for litters and puppies.', href: '/litters' },
  { title: 'Bookings', body: 'Track reservations once the domain is connected.', href: '/bookings' },
] as const;

export default function HomeScreen() {
  const { kennel, profile, workspaceError } = useAuth();
  const workspaceName = kennel?.name ?? 'Kennel workspace';

  return (
    <Screen scrollable>
      <View className="gap-2 pb-4">
        <Text className="text-3xl font-bold text-slate-950">{workspaceName}</Text>
        <Text className="text-base leading-6 text-slate-600">
          {profile?.email ? `Signed in as ${profile.email}` : 'A clean starting point for multi-tenant kennel management.'}
        </Text>
      </View>

      {workspaceError ? (
        <Card title="Workspace setup">
          <Text className="text-sm leading-5 text-red-600">{workspaceError}</Text>
        </Card>
      ) : null}

      <View className="gap-3">
        {sections.map((section) => (
          <Card key={section.href} title={section.title}>
            <Text className="mb-4 text-sm leading-5 text-slate-600">{section.body}</Text>
            <Button title={`Open ${section.title}`} onPress={() => router.push(section.href)} />
          </Card>
        ))}
      </View>
    </Screen>
  );
}
