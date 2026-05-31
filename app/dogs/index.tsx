import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { AppCard, AppScreen, Button, EmptyState, LoadingState, ScreenHeader } from '../../src/components';
import { ProtectedRoute } from '../../src/features/auth';
import {
  DogForm,
  getDogSexLabel,
  useCreateDog,
  useDeleteDog,
  useDogs,
  useUpdateDog,
} from '../../src/features/dogs';
import type { Dog, DogMutationInput } from '../../src/features/dogs';
import { useCurrentKennel } from '../../src/features/kennels';

export default function DogsScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Perros' }} />
      <ProtectedRoute>
        <DogsContent />
      </ProtectedRoute>
    </>
  );
}

function DogsContent() {
  const { action } = useLocalSearchParams<{ action?: string }>();
  const { currentKennel, currentMembership } = useCurrentKennel();
  const kennelId = currentKennel?.id ?? null;
  const dogsQuery = useDogs(kennelId);
  const createDogMutation = useCreateDog(kennelId);
  const updateDogMutation = useUpdateDog(kennelId);
  const deleteDogMutation = useDeleteDog(kennelId);
  const [editingDog, setEditingDog] = useState<Dog | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(action === 'create');
  const [formError, setFormError] = useState<string | null>(null);
  const [screenError, setScreenError] = useState<string | null>(null);
  const dogs = dogsQuery.data ?? [];
  const isOwner = currentMembership?.role === 'owner';
  const isFormSubmitting = createDogMutation.isPending || updateDogMutation.isPending;

  const openCreateForm = () => {
    setEditingDog(null);
    setFormError(null);
    setScreenError(null);
    createDogMutation.reset();
    updateDogMutation.reset();
    setIsFormOpen(true);
  };

  const openEditForm = (dog: Dog) => {
    setEditingDog(dog);
    setFormError(null);
    setScreenError(null);
    createDogMutation.reset();
    updateDogMutation.reset();
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setEditingDog(null);
    setFormError(null);
    setIsFormOpen(false);
  };

  const handleSubmitDog = async (input: DogMutationInput) => {
    setFormError(null);

    try {
      if (editingDog) {
        await updateDogMutation.mutateAsync({ dogId: editingDog.id, input });
      } else {
        await createDogMutation.mutateAsync(input);
      }

      closeForm();
    } catch (error) {
      console.error(`[DogsScreen.handleSubmitDog] ${editingDog ? 'updateDog' : 'createDog'} failed`, error);
      setFormError(getErrorMessage(error));
    }
  };

  const handleDeleteDog = (dog: Dog) => {
    Alert.alert('¿Eliminar perro?', `Se eliminará a ${dog.name} de ${currentKennel?.name ?? 'este criadero'}.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          void deleteDogMutation.mutateAsync(dog.id).catch((error) => {
            setScreenError(getErrorMessage(error));
          });
        },
      },
    ]);
  };

  return (
    <AppScreen scrollable>
      <ScreenHeader
        title="Perros"
        subtitle={`Registro de ${currentKennel?.name ?? 'criadero'}`}
        action={
          <Button
            title={isFormOpen ? 'Cerrar' : 'Añadir perro'}
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

      {isFormOpen ? (
        <DogForm
          dog={editingDog}
          errorMessage={formError}
          isSubmitting={isFormSubmitting}
          onCancel={closeForm}
          onSubmit={handleSubmitDog}
        />
      ) : null}

      {dogsQuery.isLoading ? (
        <LoadingState title="Cargando perros" message="Preparando el registro del criadero." />
      ) : null}

      {dogsQuery.error ? (
        <AppCard title="No se han podido cargar los perros" className="border-red-200 bg-red-50">
          <Text className="text-sm leading-5 text-red-600">{getErrorMessage(dogsQuery.error)}</Text>
        </AppCard>
      ) : null}

      {!dogsQuery.isLoading && !dogsQuery.error && dogs.length === 0 ? (
        <EmptyState
          title="Todavía no hay perros"
          message="Añade el primer perro para empezar a construir el registro del criadero."
          actionLabel={!isFormOpen ? 'Añadir perro' : undefined}
          onAction={!isFormOpen ? openCreateForm : undefined}
        />
      ) : null}

      {dogs.length > 0 ? (
        <View className="gap-3">
          <Text className="text-sm font-semibold text-muted">
            {dogs.length === 1 ? '1 perro registrado' : `${dogs.length} perros registrados`}
          </Text>
          {dogs.map((dog) => (
            <DogCard
              dog={dog}
              isOwner={isOwner}
              isDeleting={deleteDogMutation.isPending}
              key={dog.id}
              onDelete={() => handleDeleteDog(dog)}
              onDocuments={() => router.push(`/documents?entityType=dog&entityId=${dog.id}` as never)}
              onEdit={() => openEditForm(dog)}
            />
          ))}
        </View>
      ) : null}
    </AppScreen>
  );
}

interface DogCardProps {
  dog: Dog;
  isDeleting: boolean;
  isOwner: boolean;
  onDelete: () => void;
  onDocuments: () => void;
  onEdit: () => void;
}

function DogCard({ dog, isDeleting, isOwner, onDelete, onDocuments, onEdit }: DogCardProps) {
  const sexLabel = getDogSexLabel(dog.sex);
  const birthDate = dog.birth_date ? formatIsoDate(dog.birth_date) : null;

  return (
    <AppCard className="p-0">
      <View className="gap-4 p-4">
        <View className="flex-row gap-3">
          <Avatar name={dog.name} />

          <View className="min-w-0 flex-1 gap-2">
            <View className="gap-1">
              <Text className="text-xl font-semibold text-ink" numberOfLines={1}>
                {dog.name}
              </Text>
              <Text className="text-sm leading-5 text-muted" numberOfLines={1}>
                {dog.breed ?? 'Raza no indicada'}
              </Text>
            </View>

            <View className="flex-row flex-wrap gap-2">
              <Badge label={sexLabel} tone={dog.sex === 'female' ? 'accent' : 'brand'} />
              {birthDate ? <Badge label={`Nacimiento ${birthDate}`} /> : null}
              {dog.microchip_number ? <Badge label="Microchip" /> : null}
            </View>
          </View>
        </View>

        <View className="gap-2 border-t border-border pt-4">
          {dog.color ? <InfoLine label="Color" value={dog.color} /> : null}
          {dog.microchip_number ? <InfoLine label="Microchip" value={dog.microchip_number} /> : null}
          {!dog.color && !dog.microchip_number && !dog.notes ? (
            <Text className="text-sm leading-5 text-muted">Sin detalles adicionales todavía.</Text>
          ) : null}
          {dog.notes ? (
            <Text className="text-sm leading-5 text-muted" numberOfLines={3}>
              {dog.notes}
            </Text>
          ) : null}
        </View>

        <View className="gap-3">
          <View className="flex-row gap-3">
            <Button title="Documentos" variant="secondary" className="flex-1" onPress={onDocuments} />
            <Button title="Editar" variant="secondary" className="flex-1" onPress={onEdit} />
          </View>
          {isOwner ? (
            <Button
              title="Eliminar perro"
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
    <View className="h-16 w-16 items-center justify-center rounded-full border border-brand-100 bg-brand-50">
      <Text className="text-xl font-bold text-brand-700">{getInitials(name)}</Text>
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

function formatIsoDate(value: string) {
  const [year, month, day] = value.split('-');

  return year && month && day ? `${day}/${month}/${year}` : value;
}

function getErrorMessage(_error: unknown) {
  return 'Algo ha ido mal al gestionar los perros.';
}
