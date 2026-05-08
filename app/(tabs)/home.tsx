import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { Button, Card, Screen } from '../../src/components';

const sections = [
  { title: 'Breeders', body: 'Manage kennels and breeder profiles.', href: '/breeders' },
  { title: 'Dogs', body: 'Keep the dog registry ready for future data.', href: '/dogs' },
  { title: 'Litters', body: 'Prepare the workspace for litters and puppies.', href: '/litters' },
  { title: 'Bookings', body: 'Track reservations once the domain is connected.', href: '/bookings' },
] as const;

export default function HomeScreen() {
  return (
    <Screen scrollable>
      <View className="gap-2 pb-4">
        <Text className="text-3xl font-bold text-slate-950">Amidog</Text>
        <Text className="text-base leading-6 text-slate-600">
          A clean starting point for multi-tenant kennel management.
        </Text>
      </View>

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
