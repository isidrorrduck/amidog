import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';

import { Button, AppCard, AppScreen } from '../../src/components';
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
    <ProtectedRoute>
      <DogsContent />
    </ProtectedRoute>
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
      <View className="gap-2">
        <Text className="text-3xl font-bold text-slate-950">Perros</Text>
        <Text className="text-base leading-6 text-slate-600">Registro de {currentKennel?.name ?? 'criadero'}</Text>
      </View>

      <Button
        title={isFormOpen ? 'Cerrar formulario' : 'Añadir perro'}
        variant={isFormOpen ? 'secondary' : 'primary'}
        onPress={isFormOpen ? closeForm : openCreateForm}
      />

      {screenError ? (
        <AppCard>
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
        <AppCard title="Cargando perros">
          <View className="items-start">
            <ActivityIndicator color="#1d4ed8" />
          </View>
        </AppCard>
      ) : null}

      {dogsQuery.error ? (
        <AppCard title="No se han podido cargar los perros">
          <Text className="text-sm leading-5 text-red-600">{getErrorMessage(dogsQuery.error)}</Text>
        </AppCard>
      ) : null}

      {!dogsQuery.isLoading && !dogsQuery.error && dogs.length === 0 ? (
        <AppCard title="Todavía no hay perros">
          <View className="gap-4">
            <Text className="text-sm leading-5 text-slate-600">Añade el primer perro de este criadero.</Text>
            {!isFormOpen ? <Button title="Añadir perro" onPress={openCreateForm} /> : null}
          </View>
        </AppCard>
      ) : null}

      {dogs.length > 0 ? (
        <View className="gap-3">
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
  const details = [
    dog.breed,
    getDogSexLabel(dog.sex),
    dog.birth_date ? `Nacimiento ${dog.birth_date}` : null,
    dog.color,
    dog.microchip_number ? `Microchip ${dog.microchip_number}` : null,
  ].filter(Boolean);

  return (
    <AppCard>
      <View className="gap-3">
        <View className="gap-1">
          <Text className="text-xl font-semibold text-slate-950">{dog.name}</Text>
          <Text className="text-sm leading-5 text-slate-600">{details.join(' | ') || 'Sin detalles todavía'}</Text>
        </View>

        {dog.notes ? <Text className="text-sm leading-5 text-slate-600">{dog.notes}</Text> : null}

        <View className="gap-3">
          <Button title="Documentos" variant="secondary" onPress={onDocuments} />
          <View className="flex-row gap-3">
            <Button title="Editar" variant="secondary" className="flex-1" onPress={onEdit} />
            {isOwner ? (
              <Button
                title="Eliminar"
                variant="ghost"
                loading={isDeleting}
                className="flex-1"
                textClassName="text-red-600"
                onPress={onDelete}
              />
            ) : null}
          </View>
        </View>
      </View>
    </AppCard>
  );
}

function getErrorMessage(_error: unknown) {
  return 'Algo ha ido mal al gestionar los perros.';
}
