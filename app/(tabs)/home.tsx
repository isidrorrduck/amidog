import { router } from 'expo-router';
import { Text, View } from 'react-native';

import {
  AppCard,
  AppScreen,
  EmptyState,
  LoadingState,
  QuickActionCard,
  ScreenHeader,
  StatCard,
} from '../../src/components';
import { useAuth } from '../../src/features/auth';
import { useDogs } from '../../src/features/dogs';
import { useCurrentKennel } from '../../src/features/kennels';
import { useLitters } from '../../src/features/litters';
import { useUnreadNotificationsCount } from '../../src/features/notifications';
import { usePuppies } from '../../src/features/puppies';

const quickActions = [
  {
    body: 'Revisa y actualiza los perros registrados.',
    href: '/dogs',
    label: 'P',
    title: 'Perros',
  },
  {
    body: 'Gestiona camadas y enlaces de progenitores.',
    href: '/litters',
    label: 'C',
    title: 'Camadas',
  },
  {
    body: 'Revisa estados, clientes asignados y notas.',
    href: '/puppies',
    label: 'CH',
    title: 'Cachorros',
  },
  {
    body: 'Consulta familias, contacto y seguimiento.',
    href: '/clients',
    label: 'CL',
    title: 'Clientes',
  },
  {
    body: 'Gestiona reservas, señales y estado de entrega.',
    href: '/reservations',
    label: 'R',
    title: 'Reservas',
  },
  {
    body: 'Accede a contratos, informes y archivos.',
    href: '/documents',
    label: 'D',
    title: 'Documentos',
  },
  {
    body: 'Revisa promociones y recomendaciones activas.',
    href: '/promotions',
    label: 'PR',
    title: 'Promociones',
  },
  {
    body: 'Consulta avisos y mensajes pendientes.',
    href: '/notifications',
    label: 'N',
    title: 'Notificaciones',
  },
] as const;

export default function HomeScreen() {
  const { profile, profileError } = useAuth();
  const { currentKennel, currentMembership, isKennelLoading, kennelError } = useCurrentKennel();
  const kennelId = currentKennel?.id ?? null;
  const dogsQuery = useDogs(kennelId);
  const littersQuery = useLitters(kennelId);
  const puppiesQuery = usePuppies(kennelId);
  const unreadNotificationsQuery = useUnreadNotificationsCount(kennelId);
  const dogs = dogsQuery.data ?? [];
  const litters = littersQuery.data ?? [];
  const puppies = puppiesQuery.data ?? [];
  const unreadCount = unreadNotificationsQuery.data ?? 0;
  const hasKennel = Boolean(currentKennel);
  const isRegistryLoading = isKennelLoading || dogsQuery.isLoading || littersQuery.isLoading || puppiesQuery.isLoading;
  const firstError =
    profileError ??
    kennelError ??
    getErrorMessage(dogsQuery.error) ??
    getErrorMessage(littersQuery.error) ??
    getErrorMessage(puppiesQuery.error) ??
    getErrorMessage(unreadNotificationsQuery.error);

  return (
    <AppScreen scrollable>
      <ScreenHeader
        eyebrow="Amidog"
        title="Inicio"
        subtitle={
          profile?.email
            ? `Sesión iniciada como ${profile.email}`
            : 'Un espacio claro para gestionar registros y tareas diarias del criadero.'
        }
      />

      {isKennelLoading ? <LoadingState title="Cargando criadero" message="Preparando tu espacio de trabajo activo." /> : null}

      {!isKennelLoading && !hasKennel ? (
        <EmptyState
          title="No hay criadero activo"
          message="Crea o selecciona un criadero antes de gestionar perros, camadas y documentos."
          actionLabel="Abrir perfil"
          onAction={() => router.push('/(tabs)/profile' as never)}
        />
      ) : null}

      {firstError ? (
        <AppCard title="Requiere atención" className="border-red-100 bg-red-50">
          <Text className="text-sm leading-5 text-red-600">{firstError}</Text>
        </AppCard>
      ) : null}

      {hasKennel ? (
        <>
          <AppCard className="border-brand-700 bg-brand-700">
            <View className="gap-4">
              <View className="gap-1">
                <Text className="text-xs font-semibold uppercase text-brand-100">Criadero activo</Text>
                <Text className="text-2xl font-bold text-white">{currentKennel?.name}</Text>
                <Text className="text-sm capitalize text-brand-100">
                  Espacio de {getRoleLabel(currentMembership?.role)}
                </Text>
              </View>
              <View className="flex-row flex-wrap gap-2">
                <StatusPill label={`${unreadCount} sin leer`} />
                <StatusPill label={isRegistryLoading ? 'Sincronizando' : 'Al día'} />
              </View>
            </View>
          </AppCard>

          <View className="gap-3">
            <SectionTitle title="Resumen" />
            <View className="flex-row flex-wrap gap-3">
              <StatCard
                label="Perros"
                value={dogs.length}
                helper={dogs.length === 0 ? 'Todavía no hay perros' : 'Perros registrados'}
                loading={dogsQuery.isLoading}
                tone="brand"
              />
              <StatCard
                label="Camadas"
                value={litters.length}
                helper={litters.length === 0 ? 'Todavía no hay camadas' : 'Registro activo'}
                loading={littersQuery.isLoading}
                tone="accent"
              />
              <StatCard
                label="Cachorros"
                value={puppies.length}
                helper={puppies.length === 0 ? 'Todavía no hay cachorros' : 'Cachorros registrados'}
                loading={puppiesQuery.isLoading}
                tone="neutral"
              />
            </View>
          </View>

          <View className="gap-3">
            <SectionTitle title="Módulos" />
            <View className="flex-row flex-wrap gap-3">
              {quickActions.map((action) => (
                <QuickActionCard
                  body={action.body}
                  className="min-w-[150px]"
                  key={action.href}
                  label={action.label}
                  title={action.title}
                  onPress={() => router.push(action.href as never)}
                />
              ))}
            </View>
          </View>

          {!isRegistryLoading &&
          !dogsQuery.error &&
          !littersQuery.error &&
          !puppiesQuery.error &&
          dogs.length === 0 &&
          litters.length === 0 &&
          puppies.length === 0 ? (
            <EmptyState
              title="Empieza el registro del criadero"
              message="Abre Perros, Camadas o Cachorros para empezar a organizar el registro del criadero."
              actionLabel="Abrir perros"
              onAction={() => router.push('/dogs' as never)}
            />
          ) : null}
        </>
      ) : null}
    </AppScreen>
  );
}

interface SectionTitleProps {
  title: string;
}

function SectionTitle({ title }: SectionTitleProps) {
  return <Text className="text-lg font-semibold text-ink">{title}</Text>;
}

interface StatusPillProps {
  label: string;
}

function StatusPill({ label }: StatusPillProps) {
  return (
    <View className="rounded-full bg-white/15 px-3 py-1">
      <Text className="text-xs font-semibold text-white">{label}</Text>
    </View>
  );
}

function getErrorMessage(_error: unknown) {
  if (!_error) {
    return null;
  }

  return 'Algo ha ido mal al cargar los datos del panel.';
}

function getRoleLabel(role: string | null | undefined) {
  return role === 'owner' ? 'propietario' : 'miembro';
}
