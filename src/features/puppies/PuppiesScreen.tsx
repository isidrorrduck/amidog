import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';

import { Button, Card, Screen } from '../../components';
import { ProtectedRoute } from '../auth';
import { useCurrentKennel } from '../kennels';
import { useLitters, type Litter } from '../litters';
import { PuppyForm } from './PuppyForm';
import { getPuppySexLabel, getPuppyStatusLabel, type Puppy, type PuppyMutationInput } from './types';
import { useCreatePuppy, useDeletePuppy, usePuppies, useUpdatePuppy } from './usePuppies';

interface PuppiesScreenProps {
  initialMode?: 'create';
  initialLitterId?: string | null;
  initialPuppyId?: string | null;
}

export function PuppiesScreen(props: PuppiesScreenProps = {}) {
  return (
    <ProtectedRoute>
      <PuppiesContent {...props} />
    </ProtectedRoute>
  );
}

function PuppiesContent({ initialMode, initialLitterId, initialPuppyId }: PuppiesScreenProps) {
  const { currentKennel, currentMembership } = useCurrentKennel();
  const kennelId = currentKennel?.id ?? null;
  const [selectedLitterId, setSelectedLitterId] = useState(initialLitterId ?? '');
  const puppiesQuery = usePuppies(kennelId, selectedLitterId || null);
  const littersQuery = useLitters(kennelId);
  const createPuppyMutation = useCreatePuppy(kennelId);
  const updatePuppyMutation = useUpdatePuppy(kennelId);
  const deletePuppyMutation = useDeletePuppy(kennelId);
  const [editingPuppy, setEditingPuppy] = useState<Puppy | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(initialMode === 'create');
  const [createDefaultLitterId, setCreateDefaultLitterId] = useState(initialMode === 'create' ? initialLitterId ?? '' : '');
  const [formError, setFormError] = useState<string | null>(null);
  const [screenError, setScreenError] = useState<string | null>(null);
  const puppies = puppiesQuery.data ?? [];
  const litters = littersQuery.data ?? [];
  const littersById = useMemo(() => new Map(litters.map((litter) => [litter.id, litter])), [litters]);
  const isOwner = currentMembership?.role === 'owner';
  const isFormSubmitting = createPuppyMutation.isPending || updatePuppyMutation.isPending;
  const fallbackLitterId = selectedLitterId || (litters.length === 1 ? litters[0]?.id ?? '' : '');
  const defaultLitterId = editingPuppy ? editingPuppy.litter_id : createDefaultLitterId || fallbackLitterId;
  const isRouteForm = initialMode === 'create' || Boolean(initialPuppyId);

  useEffect(() => {
    if (initialLitterId) {
      setSelectedLitterId(initialLitterId);
    }
  }, [initialLitterId]);

  useEffect(() => {
    if (!initialPuppyId || editingPuppy || puppiesQuery.isLoading) {
      return;
    }

    const puppy = puppies.find((item) => item.id === initialPuppyId);

    if (puppy) {
      setSelectedLitterId(puppy.litter_id);
      openEditForm(puppy);
    } else if (!puppiesQuery.error) {
      setScreenError('Unable to find this puppy in the current kennel.');
    }
  }, [editingPuppy, initialPuppyId, puppies, puppiesQuery.error, puppiesQuery.isLoading]);

  const openCreateForm = (litterId = fallbackLitterId) => {
    setEditingPuppy(null);
    setCreateDefaultLitterId(litterId);
    setFormError(null);
    setScreenError(null);
    createPuppyMutation.reset();
    updatePuppyMutation.reset();
    setIsFormOpen(true);
  };

  const openEditForm = (puppy: Puppy) => {
    setEditingPuppy(puppy);
    setCreateDefaultLitterId('');
    setFormError(null);
    setScreenError(null);
    createPuppyMutation.reset();
    updatePuppyMutation.reset();
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setEditingPuppy(null);
    setFormError(null);
    setIsFormOpen(false);

    if (isRouteForm) {
      router.replace('/puppies' as never);
    }
  };

  const handleSubmitPuppy = async (input: PuppyMutationInput) => {
    setFormError(null);

    try {
      if (editingPuppy) {
        await updatePuppyMutation.mutateAsync({ puppyId: editingPuppy.id, input });
      } else {
        await createPuppyMutation.mutateAsync(input);
      }

      closeForm();
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  };

  const handleDeletePuppy = (puppy: Puppy) => {
    Alert.alert('Delete puppy?', `${puppy.name} will be removed from ${currentKennel?.name ?? 'this kennel'}.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void deletePuppyMutation.mutateAsync(puppy.id).catch((error) => {
            setScreenError(getErrorMessage(error));
          });
        },
      },
    ]);
  };

  return (
    <Screen scrollable>
      <View className="gap-2">
        <Text className="text-3xl font-bold text-slate-950">Puppies</Text>
        <Text className="text-base leading-6 text-slate-600">{currentKennel?.name ?? 'Kennel'} puppy registry</Text>
      </View>

      <Button
        title={isFormOpen ? 'Close form' : 'Create puppy'}
        variant={isFormOpen ? 'secondary' : 'primary'}
        onPress={isFormOpen ? closeForm : () => openCreateForm()}
      />

      {screenError ? (
        <Card>
          <Text className="text-sm leading-5 text-red-600">{screenError}</Text>
        </Card>
      ) : null}

      {littersQuery.error ? (
        <Card title="Unable to load litters">
          <Text className="text-sm leading-5 text-red-600">{getErrorMessage(littersQuery.error)}</Text>
        </Card>
      ) : null}

      {litters.length > 0 ? (
        <LitterFilter litters={litters} selectedLitterId={selectedLitterId} onChange={setSelectedLitterId} />
      ) : null}

      {isFormOpen ? (
        <PuppyForm
          defaultLitterId={defaultLitterId}
          litters={litters}
          puppy={editingPuppy}
          errorMessage={formError}
          isSubmitting={isFormSubmitting}
          onCancel={closeForm}
          onSubmit={handleSubmitPuppy}
        />
      ) : null}

      {puppiesQuery.isLoading || littersQuery.isLoading ? (
        <Card title="Loading puppies">
          <View className="items-start">
            <ActivityIndicator color="#1d4ed8" />
          </View>
        </Card>
      ) : null}

      {puppiesQuery.error ? (
        <Card title="Unable to load puppies">
          <Text className="text-sm leading-5 text-red-600">{getErrorMessage(puppiesQuery.error)}</Text>
        </Card>
      ) : null}

      {!littersQuery.isLoading && !littersQuery.error && litters.length === 0 ? (
        <Card title="No litters yet">
          <View className="gap-4">
            <Text className="text-sm leading-5 text-slate-600">Create a litter before adding puppies.</Text>
            <Button title="Open litters" onPress={() => router.push('/litters')} />
          </View>
        </Card>
      ) : null}

      {!puppiesQuery.isLoading && !puppiesQuery.error && litters.length > 0 && puppies.length === 0 ? (
        <Card title="No puppies yet">
          <View className="gap-4">
            <Text className="text-sm leading-5 text-slate-600">
              {selectedLitterId ? 'Create the first puppy for this litter.' : 'Create the first puppy for this kennel.'}
            </Text>
            {!isFormOpen ? <Button title="Create puppy" onPress={() => openCreateForm()} /> : null}
          </View>
        </Card>
      ) : null}

      {puppies.length > 0 ? (
        <View className="gap-3">
          {puppies.map((puppy) => (
            <PuppyCard
              isDeleting={deletePuppyMutation.isPending}
              isOwner={isOwner}
              key={puppy.id}
              littersById={littersById}
              puppy={puppy}
              onDelete={() => handleDeletePuppy(puppy)}
              onDocuments={() => router.push(`/documents?entityType=puppy&entityId=${puppy.id}` as never)}
              onEdit={() => openEditForm(puppy)}
            />
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

interface LitterFilterProps {
  litters: Litter[];
  selectedLitterId: string;
  onChange: (litterId: string) => void;
}

function LitterFilter({ litters, selectedLitterId, onChange }: LitterFilterProps) {
  return (
    <Card title="Litter filter">
      <View className="flex-row flex-wrap gap-2">
        <FilterOption label="All litters" isSelected={!selectedLitterId} onPress={() => onChange('')} />
        {litters.map((litter) => (
          <FilterOption
            key={litter.id}
            label={litter.name}
            isSelected={selectedLitterId === litter.id}
            onPress={() => onChange(litter.id)}
          />
        ))}
      </View>
    </Card>
  );
}

interface FilterOptionProps {
  isSelected: boolean;
  label: string;
  onPress: () => void;
}

function FilterOption({ isSelected, label, onPress }: FilterOptionProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className={`min-h-11 max-w-full items-center justify-center rounded-lg border px-3 ${
        isSelected ? 'border-brand-600 bg-brand-50' : 'border-slate-300 bg-white'
      }`}
    >
      <Text
        numberOfLines={1}
        className={`max-w-full text-sm font-semibold ${isSelected ? 'text-brand-700' : 'text-slate-700'}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

interface PuppyCardProps {
  isDeleting: boolean;
  isOwner: boolean;
  littersById: Map<string, Litter>;
  puppy: Puppy;
  onDelete: () => void;
  onDocuments: () => void;
  onEdit: () => void;
}

function PuppyCard({ isDeleting, isOwner, littersById, puppy, onDelete, onDocuments, onEdit }: PuppyCardProps) {
  const litterName = littersById.get(puppy.litter_id)?.name ?? 'Unknown litter';
  const details = [
    `Litter ${litterName}`,
    getPuppySexLabel(puppy.sex),
    getPuppyStatusLabel(puppy.status),
    puppy.color,
    puppy.birth_weight !== null ? `Birth weight ${puppy.birth_weight}` : null,
  ].filter(Boolean);

  return (
    <Card>
      <View className="gap-3">
        <View className="gap-1">
          <Text className="text-xl font-semibold text-slate-950">{puppy.name}</Text>
          <Text className="text-sm leading-5 text-slate-600">{details.join(' | ') || 'No details yet'}</Text>
        </View>

        {puppy.notes ? <Text className="text-sm leading-5 text-slate-600">{puppy.notes}</Text> : null}

        <View className="gap-3">
          <Button title="Documents" variant="secondary" onPress={onDocuments} />
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

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong while managing puppies.';
}
