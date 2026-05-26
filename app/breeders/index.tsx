import { Text, View } from 'react-native';

import { AppCard, AppScreen } from '../../src/components';
import { ProtectedRoute } from '../../src/features/auth';

export default function BreedersScreen() {
  return (
    <ProtectedRoute>
      <AppScreen>
        <View className="gap-2">
          <Text className="text-3xl font-bold text-slate-950">Criadores</Text>
          <Text className="text-base leading-6 text-slate-600">
            Esta sección está preparada para gestionar criaderos y perfiles de criador.
          </Text>
        </View>
        <AppCard title="Base">
          <Text className="text-sm leading-5 text-slate-600">
            Los datos multi-criadero se conectarán aquí cuando el esquema de Supabase esté definido.
          </Text>
        </AppCard>
      </AppScreen>
    </ProtectedRoute>
  );
}
