import { router } from 'expo-router';
import { Text } from 'react-native';

import { AppCard, AppScreen, Button, EmptyState, LoadingState, ScreenHeader } from '../../../components';
import { ProtectedRoute } from '../../auth';
import { useDog, type Dog } from '../../dogs';
import { useCurrentKennel } from '../../kennels';
import { usePuppy, type Puppy } from '../../puppies';
import type { HealthSubjectType, HealthTimelineSubject } from '../types';
import { HealthTimeline } from './HealthTimeline';

interface HealthTimelineScreenProps {
  subjectId: string | null;
  subjectType: HealthSubjectType;
}

export function HealthTimelineScreen(props: HealthTimelineScreenProps) {
  return (
    <ProtectedRoute>
      <HealthTimelineContent {...props} />
    </ProtectedRoute>
  );
}

function HealthTimelineContent({ subjectId, subjectType }: HealthTimelineScreenProps) {
  const { currentKennel, currentMembership } = useCurrentKennel();
  const kennelId = currentKennel?.id ?? null;
  const dogQuery = useDog(kennelId, subjectType === 'dog' ? subjectId : null);
  const puppyQuery = usePuppy(kennelId, subjectType === 'puppy' ? subjectId : null);
  const subject = getSubject(subjectType, dogQuery.data ?? null, puppyQuery.data ?? null);
  const isOwner = currentMembership?.role === 'owner';
  const isLoading = subjectType === 'dog' ? dogQuery.isLoading : puppyQuery.isLoading;
  const subjectError = subjectType === 'dog' ? dogQuery.error : puppyQuery.error;
  const backHref = subjectType === 'dog' ? '/dogs' : subjectId ? `/puppies/${subjectId}` : '/puppies';

  return (
    <AppScreen scrollable>
      <ScreenHeader
        title={subject ? `Salud de ${subject.label}` : 'Salud'}
        subtitle={`Línea temporal de ${currentKennel?.name ?? 'criadero'}`}
        action={<Button title="Volver" variant="secondary" onPress={() => router.replace(backHref as never)} />}
      />

      {isLoading ? <LoadingState title="Cargando salud" message="Preparando el registro vinculado." /> : null}

      {subjectError ? (
        <AppCard title="No se ha podido cargar el registro" className="border-red-200 bg-red-50">
          <Text className="text-sm leading-5 text-red-600">{getErrorMessage(subjectError)}</Text>
        </AppCard>
      ) : null}

      {!isLoading && !subjectError && !subject ? (
        <EmptyState
          title={subjectType === 'dog' ? 'Perro no encontrado' : 'Cachorro no encontrado'}
          message="No se ha encontrado este registro en el criadero actual."
          actionLabel={subjectType === 'dog' ? 'Volver a perros' : 'Volver a cachorros'}
          onAction={() => router.replace((subjectType === 'dog' ? '/dogs' : '/puppies') as never)}
        />
      ) : null}

      {subject ? (
        <HealthTimeline
          kennelId={kennelId}
          kennelName={currentKennel?.name}
          subject={subject}
          isOwner={isOwner}
        />
      ) : null}
    </AppScreen>
  );
}

function getSubject(
  subjectType: HealthSubjectType,
  dog: Dog | null,
  puppy: Puppy | null,
): HealthTimelineSubject | null {
  if (subjectType === 'dog') {
    return dog ? { id: dog.id, label: dog.name, type: 'dog' } : null;
  }

  return puppy ? { id: puppy.id, label: puppy.name || 'Cachorro sin nombre', type: 'puppy' } : null;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Algo ha ido mal al cargar el registro de salud.';
}
