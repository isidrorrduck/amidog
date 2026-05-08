import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { Button, Card, Input, Screen } from '../../src/components';

export default function RegisterScreen() {
  return (
    <Screen contentClassName="justify-center">
      <View className="mb-8 gap-2">
        <Text className="text-4xl font-bold text-slate-950">Create kennel</Text>
        <Text className="text-base leading-6 text-slate-600">
          Set up the first account shell for Amidog.
        </Text>
      </View>

      <Card>
        <View className="gap-4">
          <Input label="Kennel name" placeholder="Oak Valley Kennels" />
          <Input label="Email" placeholder="you@example.com" autoCapitalize="none" keyboardType="email-address" />
          <Input label="Password" placeholder="Password" secureTextEntry />
          <Button title="Register" onPress={() => router.replace('/(tabs)/home')} />
          <Button title="I already have an account" variant="secondary" onPress={() => router.back()} />
        </View>
      </Card>
    </Screen>
  );
}
