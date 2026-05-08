import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { Button, Card, Input, Screen } from '../../src/components';

export default function LoginScreen() {
  return (
    <Screen contentClassName="justify-center">
      <View className="mb-8 gap-2">
        <Text className="text-4xl font-bold text-slate-950">Welcome back</Text>
        <Text className="text-base leading-6 text-slate-600">
          Sign in to enter your kennel workspace.
        </Text>
      </View>

      <Card>
        <View className="gap-4">
          <Input label="Email" placeholder="you@example.com" autoCapitalize="none" keyboardType="email-address" />
          <Input label="Password" placeholder="Password" secureTextEntry />
          <Button title="Log in" onPress={() => router.replace('/(tabs)/home')} />
          <Button title="Create account" variant="secondary" onPress={() => router.push('/auth/register')} />
        </View>
      </Card>
    </Screen>
  );
}
