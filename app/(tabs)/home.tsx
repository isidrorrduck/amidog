import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { Button, Card, Screen } from '../../src/components';
import { useAuth } from '../../src/features/auth';
import { useCurrentKennel } from '../../src/features/kennels';

const sections = [
  { title: 'Criadores', body: 'Gestiona criaderos y perfiles de cría.', href: '/breeders' },
  { title: 'Perros', body: 'Mantén el registro de perros listo para el trabajo diario.', href: '/dogs' },
  { title: 'Clientes', body: 'Gestiona contactos y notas de seguimiento.', href: '/clients' },
  { title: 'Camadas', body: 'Organiza camadas, fechas y cachorros.', href: '/litters' },
  { title: 'Cachorros', body: 'Gestiona cachorros por camada, estado y notas.', href: '/puppies' },
  { title: 'Reservas', body: 'Gestiona reservas de cachorros, señales y estado de venta.', href: '/reservations' },
] as const;

export default function HomeScreen() {
  const { profile, profileError } = useAuth();
  const { currentKennel, kennelError } = useCurrentKennel();
  const workspaceName = currentKennel?.name ?? 'Espacio del criadero';

  return (
    <Screen scrollable>
      <View className="gap-2 pb-4">
        <Text className="text-3xl font-bold text-slate-950">{workspaceName}</Text>
        <Text className="text-base leading-6 text-slate-600">
          {profile?.email ? `Sesión iniciada como ${profile.email}` : 'Un punto de partida para gestionar criaderos.'}
        </Text>
      </View>

      {profileError || kennelError ? (
        <Card title="Configuración del espacio">
          <Text className="text-sm leading-5 text-red-600">{profileError ?? kennelError}</Text>
        </Card>
      ) : null}

      <View className="gap-3">
        {sections.map((section) => (
          <Card key={section.href} title={section.title}>
            <Text className="mb-4 text-sm leading-5 text-slate-600">{section.body}</Text>
            <Button title={`Abrir ${section.title}`} onPress={() => router.push(section.href as never)} />
          </Card>
        ))}
      </View>
    </Screen>
  );
}
