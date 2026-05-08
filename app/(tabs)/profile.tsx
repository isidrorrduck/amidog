import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { Button, Card, Screen } from '../../src/components';

export default function ProfileScreen() {
  return (
    <Screen>
      <View className="gap-2">
        <Text className="text-3xl font-bold text-slate-950">Profile</Text>
        <Text className="text-base leading-6 text-slate-600">
          Account settings will live here once authentication is wired to Supabase.
        </Text>
      </View>

      <Card title="Session">
        <Text className="mb-4 text-sm leading-5 text-slate-600">
          This starter screen is intentionally simple while the app foundation settles.
        </Text>
        <Button title="Back to login" variant="secondary" onPress={() => router.replace('/auth/login')} />
      </Card>
    </Screen>
  );
}
