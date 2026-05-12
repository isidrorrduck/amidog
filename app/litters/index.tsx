import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';

import { Button, Card, Screen } from '../../src/components';
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
  const { currentKennel, currentMembership } = useCurrentKennel();
  const kennelId = currentKennel?.id ?? null;
  const littersQuery = useLitters(kennelId);
  const dogsQuery = useDogs(kennelId);
  const createLitterMutation = useCreateLitter(kennelId);
  const updateLitterMutation = useUpdateLitter(kennelId);
  const deleteLitterMutation = useDeleteLitter(kennelId);
  const [editingLitter, setEditingLitter] = useState<Litter | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
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
    Alert.alert('Delete litter?', `${litter.name} will be removed from ${currentKennel?.name ?? 'this kennel'}.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
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
    <Screen scrollable>
      <View className="gap-2">
        <Text className="text-3xl font-bold text-slate-950">Litters</Text>
        <Text className="text-base leading-6 text-slate-600">{currentKennel?.name ?? 'Kennel'} litter registry</Text>
      </View>

      <Button
        title={isFormOpen ? 'Close form' : 'Create litter'}
        variant={isFormOpen ? 'secondary' : 'primary'}
        onPress={isFormOpen ? closeForm : openCreateForm}
      />

      {screenError ? (
        <Card>
          <Text className="text-sm leading-5 text-red-600">{screenError}</Text>
        </Card>
      ) : null}

      {dogsQuery.error ? (
        <Card title="Unable to load parent dogs">
          <Text className="text-sm leading-5 text-red-600">{getErrorMessage(dogsQuery.error)}</Text>
        </Card>
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
        <Card title="Loading litters">
          <View className="items-start">
            <ActivityIndicator color="#1d4ed8" />
          </View>
        </Card>
      ) : null}

      {littersQuery.error ? (
        <Card title="Unable to load litters">
          <Text className="text-sm leading-5 text-red-600">{getErrorMessage(littersQuery.error)}</Text>
        </Card>
      ) : null}

      {!littersQuery.isLoading && !dogsQuery.isLoading && !littersQuery.error && litters.length === 0 ? (
        <Card title="No litters yet">
          <View className="gap-4">
            <Text className="text-sm leading-5 text-slate-600">Create the first litter for this kennel.</Text>
            {!isFormOpen ? <Button title="Create litter" onPress={openCreateForm} /> : null}
          </View>
        </Card>
      ) : null}

      {litters.length > 0 ? (
        <View className="gap-3">
          {litters.map((litter) => (
            <LitterCard
              dogsById={dogsById}
              isDeleting={deleteLitterMutation.isPending}
              isOwner={isOwner}
              key={litter.id}
              litter={litter}
              onDelete={() => handleDeleteLitter(litter)}
              onEdit={() => openEditForm(litter)}
              onPuppies={() => router.push(`/puppies?litterId=${litter.id}` as never)}
            />
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

interface LitterCardProps {
  dogsById: Map<string, Dog>;
  isDeleting: boolean;
  isOwner: boolean;
  litter: Litter;
  onDelete: () => void;
  onEdit: () => void;
  onPuppies: () => void;
}

function LitterCard({ dogsById, isDeleting, isOwner, litter, onDelete, onEdit, onPuppies }: LitterCardProps) {
  const motherName = getDogName(litter.mother_id, dogsById);
  const fatherName = getDogName(litter.father_id, dogsById);
  const details = [
    getLitterStatusLabel(litter.status),
    litter.expected_birth_date ? `Expected ${litter.expected_birth_date}` : null,
    litter.birth_date ? `Born ${litter.birth_date}` : null,
    motherName ? `Mother ${motherName}` : null,
    fatherName ? `Father ${fatherName}` : null,
  ].filter(Boolean);

  return (
    <Card>
      <View className="gap-3">
        <View className="gap-1">
          <Text className="text-xl font-semibold text-slate-950">{litter.name}</Text>
          <Text className="text-sm leading-5 text-slate-600">{details.join(' | ') || 'No details yet'}</Text>
        </View>

        {litter.notes ? <Text className="text-sm leading-5 text-slate-600">{litter.notes}</Text> : null}

        <View className="gap-3">
          <Button title="Puppies" variant="secondary" onPress={onPuppies} />
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
      </View>
    </Card>
  );
}

function getDogName(dogId: string | null, dogsById: Map<string, Dog>) {
  if (!dogId) {
    return null;
  }

  return dogsById.get(dogId)?.name ?? 'Unknown dog';
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong while managing litters.';
}
