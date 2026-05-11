import { useState } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';

import { Button, Card, Screen } from '../../src/components';
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
  const { currentKennel, currentMembership } = useCurrentKennel();
  const kennelId = currentKennel?.id ?? null;
  const dogsQuery = useDogs(kennelId);
  const createDogMutation = useCreateDog(kennelId);
  const updateDogMutation = useUpdateDog(kennelId);
  const deleteDogMutation = useDeleteDog(kennelId);
  const [editingDog, setEditingDog] = useState<Dog | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
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
    Alert.alert('Delete dog?', `${dog.name} will be removed from ${currentKennel?.name ?? 'this kennel'}.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
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
    <Screen scrollable>
      <View className="gap-2">
        <Text className="text-3xl font-bold text-slate-950">Dogs</Text>
        <Text className="text-base leading-6 text-slate-600">{currentKennel?.name ?? 'Kennel'} registry</Text>
      </View>

      <Button
        title={isFormOpen ? 'Close form' : 'Create dog'}
        variant={isFormOpen ? 'secondary' : 'primary'}
        onPress={isFormOpen ? closeForm : openCreateForm}
      />

      {screenError ? (
        <Card>
          <Text className="text-sm leading-5 text-red-600">{screenError}</Text>
        </Card>
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
        <Card title="Loading dogs">
          <View className="items-start">
            <ActivityIndicator color="#1d4ed8" />
          </View>
        </Card>
      ) : null}

      {dogsQuery.error ? (
        <Card title="Unable to load dogs">
          <Text className="text-sm leading-5 text-red-600">{getErrorMessage(dogsQuery.error)}</Text>
        </Card>
      ) : null}

      {!dogsQuery.isLoading && !dogsQuery.error && dogs.length === 0 ? (
        <Card title="No dogs yet">
          <View className="gap-4">
            <Text className="text-sm leading-5 text-slate-600">Create the first dog for this kennel.</Text>
            {!isFormOpen ? <Button title="Create dog" onPress={openCreateForm} /> : null}
          </View>
        </Card>
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
              onEdit={() => openEditForm(dog)}
            />
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

interface DogCardProps {
  dog: Dog;
  isDeleting: boolean;
  isOwner: boolean;
  onDelete: () => void;
  onEdit: () => void;
}

function DogCard({ dog, isDeleting, isOwner, onDelete, onEdit }: DogCardProps) {
  const details = [
    dog.breed,
    getDogSexLabel(dog.sex),
    dog.birth_date ? `Born ${dog.birth_date}` : null,
    dog.color,
    dog.microchip_number ? `Chip ${dog.microchip_number}` : null,
  ].filter(Boolean);

  return (
    <Card>
      <View className="gap-3">
        <View className="gap-1">
          <Text className="text-xl font-semibold text-slate-950">{dog.name}</Text>
          <Text className="text-sm leading-5 text-slate-600">{details.join(' | ') || 'No details yet'}</Text>
        </View>

        {dog.notes ? <Text className="text-sm leading-5 text-slate-600">{dog.notes}</Text> : null}

        <View className="flex-row gap-3">
          <Button title="Edit" variant="secondary" className="flex-1" onPress={onEdit} />
          {isOwner ? (
            <Button
              title="Delete"
              variant="ghost"
              loading={isDeleting}
              className="flex-1"
              textClassName="text-red-600"
              onPress={onDelete}
            />
          ) : null}
        </View>
      </View>
    </Card>
  );
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong while managing dogs.';
}
