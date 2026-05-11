import { Text, View } from 'react-native';

import { Card, Screen } from '../../src/components';
import { ProtectedRoute } from '../../src/features/auth';

export default function BreedersScreen() {
  return (
    <ProtectedRoute>
      <Screen>
        <View className="gap-2">
          <Text className="text-3xl font-bold text-slate-950">Breeders</Text>
          <Text className="text-base leading-6 text-slate-600">
            This route is ready for kennel and breeder management.
          </Text>
        </View>
        <Card title="Foundation">
          <Text className="text-sm leading-5 text-slate-600">
            Multi-tenant breeder data will connect here after the Supabase schema is defined.
          </Text>
        </Card>
      </Screen>
    </ProtectedRoute>
  );
}
