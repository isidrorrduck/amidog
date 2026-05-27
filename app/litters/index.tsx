import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { AppCard, AppScreen, Button, EmptyState, LoadingState, ScreenHeader } from '../../src/components';
import { ProtectedRoute } from '../../src/features/auth';
import { useDogs } from '../../src/features/dogs';
import type { Dog } from '../../src/features/dogs';
import { useCurrentKennel } from '../../src/features/kennels';
import {
  LitterForm,
  getLitterStatusLabel,
  useCreateLitter,
  useDeleteLitter,
  useLitters,
  useUpdateLitter,
} from '../../src/features/litters';
import type { Litter, LitterMutationInput } from '../../src/features/litters';

export default function LittersScreen() {
  return (
    <ProtectedRoute>
      <LittersContent />
    </ProtectedRoute>
  );
}

function LittersContent() {
  const { action } = useLocalSearchParams<{ action?: string }>();
  const { currentKennel, currentMembership } = useCurrentKennel();
  const kennelId = currentKennel?.id ?? null;
  const littersQuery = useLitters(kennelId);
  const dogsQuery = useDogs(kennelId);
  const createLitterMutation = useCreateLitter(kennelId);
  const updateLitterMutation = useUpdateLitter(kennelId);
  const deleteLitterMutation = useDeleteLitter(kennelId);
  const [editingLitter, setEditingLitter] = useState<Litter | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(action === 'create');
  const [formError, setFormError] = useState<string | null>(null);
  const [screenError, setScreenError] = useState<string | null>(null);
  const litters = littersQuery.data ?? [];
  const dogs = dogsQuery.data ?? [];
  const dogsById = useMemo(() => new Map(dogs.map((dog) => [dog.id, dog])), [dogs]);
  const isOwner = currentMembership?.role === 'owner';
  const isFormSubmitting = createLitterMutation.isPending || updateLitterMutation.isPending;

  const openCreateForm = () => {
    setEditingLitter(null);
    setFormError(null);
    setScreenError(null);
    createLitterMutation.reset();
    updateLitterMutation.reset();
    setIsFormOpen(true);
  };

  const openEditForm = (litter: Litter) => {
    setEditingLitter(litter);
    setFormError(null);
    setScreenError(null);
    createLitterMutation.reset();
    updateLitterMutation.reset();
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setEditingLitter(null);
    setFormError(null);
    setIsFormOpen(false);
  };

  const handleSubmitLitter = async (input: LitterMutationInput) => {
    setFormError(null);

    try {
      if (editingLitter) {
        await updateLitterMutation.mutateAsync({ litterId: editingLitter.id, input });
      } else {
        await createLitterMutation.mutateAsync(input);
      }

      closeForm();
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  };

  const handleDeleteLitter = (litter: Litter) => {
    Alert.alert('¿Eliminar camada?', `Se eliminará ${litter.name} de ${currentKennel?.name ?? 'este criadero'}.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          void deleteLitterMutation.mutateAsync(litter.id).catch((error) => {
            setScreenError(getErrorMessage(error));
          });
        },
      },
    ]);
  };

  return (
    <AppScreen scrollable>
      <ScreenHeader
        title="Camadas"
        subtitle={`Registro de camadas de ${currentKennel?.name ?? 'criadero'}`}
        action={
          <Button
            title={isFormOpen ? 'Cerrar' : 'Añadir camada'}
            variant={isFormOpen ? 'secondary' : 'primary'}
            onPress={isFormOpen ? closeForm : openCreateForm}
          />
        }
      />

      {screenError ? (
        <AppCard className="border-red-200 bg-red-50">
          <Text className="text-sm leading-5 text-red-600">{screenError}</Text>
        </AppCard>
      ) : null}

      {dogsQuery.error ? (
        <AppCard title="No se han podido cargar los progenitores" className="border-red-200 bg-red-50">
          <Text className="text-sm leading-5 text-red-600">{getErrorMessage(dogsQuery.error)}</Text>
        </AppCard>
      ) : null}

      {isFormOpen ? (
        <LitterForm
          dogs={dogs}
          litter={editingLitter}
          errorMessage={formError}
          isSubmitting={isFormSubmitting}
          onCancel={closeForm}
          onSubmit={handleSubmitLitter}
        />
      ) : null}

      {littersQuery.isLoading || dogsQuery.isLoading ? (
        <LoadingState title="Cargando camadas" message="Preparando el registro del criadero." />
      ) : null}

      {littersQuery.error ? (
        <AppCard title="No se han podido cargar las camadas" className="border-red-200 bg-red-50">
          <Text className="text-sm leading-5 text-red-600">{getErrorMessage(littersQuery.error)}</Text>
        </AppCard>
      ) : null}

      {!littersQuery.isLoading && !dogsQuery.isLoading && !littersQuery.error && litters.length === 0 ? (
        <EmptyState
          title="Todavía no hay camadas"
          message="Registra la primera camada para conectar progenitores, fechas y cachorros."
          actionLabel={!isFormOpen ? 'Añadir camada' : undefined}
          onAction={!isFormOpen ? openCreateForm : undefined}
        />
      ) : null}

      {litters.length > 0 ? (
        <View className="gap-3">
          <Text className="text-sm font-semibold text-muted">
            {litters.length === 1 ? '1 camada registrada' : `${litters.length} camadas registradas`}
          </Text>
          {litters.map((litter) => (
            <LitterCard
              dogsById={dogsById}
              isDeleting={deleteLitterMutation.isPending}
              isOwner={isOwner}
              key={litter.id}
              litter={litter}
              onDelete={() => handleDeleteLitter(litter)}
              onDocuments={() => router.push(`/documents?entityType=litter&entityId=${litter.id}` as never)}
              onEdit={() => openEditForm(litter)}
              onPuppies={() => router.push(`/puppies?litterId=${litter.id}` as never)}
            />
          ))}
        </View>
      ) : null}
    </AppScreen>
  );
}

interface LitterCardProps {
  dogsById: Map<string, Dog>;
  isDeleting: boolean;
  isOwner: boolean;
  litter: Litter;
  onDelete: () => void;
  onDocuments: () => void;
  onEdit: () => void;
  onPuppies: () => void;
}

function LitterCard({
  dogsById,
  isDeleting,
  isOwner,
  litter,
  onDelete,
  onDocuments,
  onEdit,
  onPuppies,
}: LitterCardProps) {
  const motherName = getDogName(litter.mother_id, dogsById);
  const fatherName = getDogName(litter.father_id, dogsById);
  const statusLabel = getLitterStatusLabel(litter.status);
  const birthDate = litter.birth_date ? formatIsoDate(litter.birth_date) : null;
  const expectedBirthDate = litter.expected_birth_date ? formatIsoDate(litter.expected_birth_date) : null;

  return (
    <AppCard className="p-0">
      <View className="gap-4 p-4">
        <View className="flex-row gap-3">
          <Avatar name={litter.name} />

          <View className="min-w-0 flex-1 gap-2">
            <View className="gap-1">
              <Text className="text-xl font-semibold text-ink" numberOfLines={1}>
                {litter.name}
              </Text>
              <Text className="text-sm leading-5 text-muted" numberOfLines={1}>
                {birthDate ? `Nacimiento ${birthDate}` : expectedBirthDate ? `Prevista ${expectedBirthDate}` : 'Fecha pendiente'}
              </Text>
            </View>

            <View className="flex-row flex-wrap gap-2">
              <Badge label={statusLabel} tone={getStatusTone(litter.status)} />
              {birthDate ? <Badge label={`Nacimiento ${birthDate}`} /> : null}
              {!birthDate && expectedBirthDate ? <Badge label={`Prevista ${expectedBirthDate}`} /> : null}
            </View>
          </View>
        </View>

        <View className="gap-2 border-t border-border pt-4">
          <InfoLine label="Madre" value={motherName ?? 'Sin asignar'} />
          <InfoLine label="Padre" value={fatherName ?? 'Sin asignar'} />
          {litter.notes ? (
            <Text className="text-sm leading-5 text-muted" numberOfLines={3}>
              {litter.notes}
            </Text>
          ) : null}
        </View>

        <View className="gap-3">
          <View className="flex-row gap-3">
            <Button title="Cachorros" variant="secondary" className="flex-1" onPress={onPuppies} />
            <Button title="Documentos" variant="secondary" className="flex-1" onPress={onDocuments} />
          </View>
          <Button title="Editar camada" variant="secondary" onPress={onEdit} />
          {isOwner ? (
            <Button
              title="Eliminar camada"
              variant="ghost"
              loading={isDeleting}
              textClassName="text-red-600"
              onPress={onDelete}
            />
          ) : null}
        </View>
      </View>
    </AppCard>
  );
}

interface BadgeProps {
  label: string;
  tone?: 'brand' | 'accent' | 'neutral';
}

function Badge({ label, tone = 'neutral' }: BadgeProps) {
  const containerClass =
    tone === 'brand'
      ? 'border-brand-100 bg-brand-50'
      : tone === 'accent'
        ? 'border-accent-500 bg-accent-50'
        : 'border-border bg-slate-50';
  const textClass = tone === 'brand' ? 'text-brand-700' : tone === 'accent' ? 'text-accent-600' : 'text-muted';

  return (
    <View className={`rounded-full border px-3 py-1 ${containerClass}`}>
      <Text className={`text-xs font-semibold ${textClass}`}>{label}</Text>
    </View>
  );
}

interface InfoLineProps {
  label: string;
  value: string;
}

function InfoLine({ label, value }: InfoLineProps) {
  return (
    <View className="flex-row items-start justify-between gap-3">
      <Text className="text-sm font-semibold text-muted">{label}</Text>
      <Text className="min-w-0 flex-1 text-right text-sm leading-5 text-ink" numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <View className="h-16 w-16 items-center justify-center rounded-lg border border-accent-500 bg-accent-50">
      <Text className="text-xl font-bold text-accent-600">{getInitials(name)}</Text>
    </View>
  );
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function getStatusTone(status: Litter['status']): BadgeProps['tone'] {
  if (status === 'born') {
    return 'brand';
  }

  if (status === 'expected') {
    return 'accent';
  }

  return 'neutral';
}

function formatIsoDate(value: string) {
  const [year, month, day] = value.split('-');

  return year && month && day ? `${day}/${month}/${year}` : value;
}

function getDogName(dogId: string | null, dogsById: Map<string, Dog>) {
  if (!dogId) {
    return null;
  }

  return dogsById.get(dogId)?.name ?? 'Perro desconocido';
}

function getErrorMessage(_error: unknown) {
  return 'Algo ha ido mal al gestionar las camadas.';
}
