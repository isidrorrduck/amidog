import { Text, View } from 'react-native';

import { Button, AppCard, AppScreen } from '../../src/components';
import { useAuth } from '../../src/features/auth';
import { KennelSelector, useCurrentKennel } from '../../src/features/kennels';

export default function ProfileScreen() {
  const { profile, signOut, user } = useAuth();
  const { currentKennel, currentMembership } = useCurrentKennel();

  return (
    <AppScreen>
      <View className="gap-2">
        <Text className="text-3xl font-bold text-slate-950">Profile</Text>
        <Text className="text-base leading-6 text-slate-600">
          Account and workspace basics from Supabase Auth.
        </Text>
      </View>

      <AppCard title="Session">
        <View className="mb-4 gap-2">
          <Text className="text-sm leading-5 text-slate-600">Email: {profile?.email ?? user?.email ?? 'Unknown'}</Text>
          <Text className="text-sm leading-5 text-slate-600">
            Kennel: {currentKennel?.name ?? 'Preparing workspace'}
          </Text>
          <Text className="text-sm capitalize leading-5 text-slate-600">
            Role: {currentMembership?.role ?? 'member'}
          </Text>
        </View>
        <Button title="Log out" variant="secondary" onPress={signOut} />
      </AppCard>

      <KennelSelector allowCreate />
    </AppScreen>
  );
}
