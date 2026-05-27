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
        <Text className="text-3xl font-bold text-slate-950">Perfil</Text>
        <Text className="text-base leading-6 text-slate-600">
          Datos básicos de tu cuenta y del espacio de trabajo.
        </Text>
      </View>

      <AppCard title="Sesión">
        <View className="mb-4 gap-2">
          <Text className="text-sm leading-5 text-slate-600">Correo: {profile?.email ?? user?.email ?? 'Desconocido'}</Text>
          <Text className="text-sm leading-5 text-slate-600">
            Criadero: {currentKennel?.name ?? 'Preparando espacio'}
          </Text>
          <Text className="text-sm capitalize leading-5 text-slate-600">
            Rol: {getRoleLabel(currentMembership?.role)}
          </Text>
        </View>
        <Button title="Cerrar sesión" variant="secondary" onPress={signOut} />
      </AppCard>

      <KennelSelector allowCreate />
    </AppScreen>
  );
}

function getRoleLabel(role: string | null | undefined) {
  return role === 'owner' ? 'Propietario' : 'Miembro';
}
