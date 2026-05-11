import { Text, View } from 'react-native';

import { Button, Card, Screen } from '../../src/components';
import { useAuth } from '../../src/features/auth';

export default function ProfileScreen() {
  const { kennel, profile, signOut, user } = useAuth();

  return (
    <Screen>
      <View className="gap-2">
        <Text className="text-3xl font-bold text-slate-950">Profile</Text>
        <Text className="text-base leading-6 text-slate-600">
          Account and workspace basics from Supabase Auth.
        </Text>
      </View>

      <Card title="Session">
        <View className="mb-4 gap-2">
          <Text className="text-sm leading-5 text-slate-600">Email: {profile?.email ?? user?.email ?? 'Unknown'}</Text>
          <Text className="text-sm leading-5 text-slate-600">Kennel: {kennel?.name ?? 'Preparing workspace'}</Text>
        </View>
        <Button title="Log out" variant="secondary" onPress={signOut} />
      </Card>
    </Screen>
  );
}
