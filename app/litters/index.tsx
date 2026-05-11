import { Text, View } from 'react-native';

import { Card, Screen } from '../../src/components';
import { ProtectedRoute } from '../../src/features/auth';

export default function LittersScreen() {
  return (
    <ProtectedRoute>
      <Screen>
        <View className="gap-2">
          <Text className="text-3xl font-bold text-slate-950">Litters</Text>
          <Text className="text-base leading-6 text-slate-600">A place for future litter and puppy workflows.</Text>
        </View>
        <Card title="Foundation">
          <Text className="text-sm leading-5 text-slate-600">
            Litter planning, puppy records and media can be added when the domain model is ready.
          </Text>
        </Card>
      </Screen>
    </ProtectedRoute>
  );
}
