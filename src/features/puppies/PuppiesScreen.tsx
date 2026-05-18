import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';

import { Button, AppCard, AppScreen } from '../../components';
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
      setScreenError('No se ha encontrado este cachorro en el criadero actual.');
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
    Alert.alert('¿Eliminar cachorro?', `Se eliminará a ${puppy.name} de ${currentKennel?.name ?? 'este criadero'}.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
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
    <AppScreen scrollable>
      <View className="gap-2">
        <Text className="text-3xl font-bold text-slate-950">Cachorros</Text>
        <Text className="text-base leading-6 text-slate-600">Registro de cachorros de {currentKennel?.name ?? 'criadero'}</Text>
      </View>

      <Button
        title={isFormOpen ? 'Cerrar formulario' : 'Añadir cachorro'}
        variant={isFormOpen ? 'secondary' : 'primary'}
        onPress={isFormOpen ? closeForm : () => openCreateForm()}
      />

      {screenError ? (
        <AppCard>
          <Text className="text-sm leading-5 text-red-600">{screenError}</Text>
        </AppCard>
      ) : null}

      {littersQuery.error ? (
        <AppCard title="No se han podido cargar las camadas">
          <Text className="text-sm leading-5 text-red-600">{getErrorMessage(littersQuery.error)}</Text>
        </AppCard>
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
        <AppCard title="Cargando cachorros">
          <View className="items-start">
            <ActivityIndicator color="#1d4ed8" />
          </View>
        </AppCard>
      ) : null}

      {puppiesQuery.error ? (
        <AppCard title="No se han podido cargar los cachorros">
          <Text className="text-sm leading-5 text-red-600">{getErrorMessage(puppiesQuery.error)}</Text>
        </AppCard>
      ) : null}

      {!littersQuery.isLoading && !littersQuery.error && litters.length === 0 ? (
        <AppCard title="Todavía no hay camadas">
          <View className="gap-4">
            <Text className="text-sm leading-5 text-slate-600">Crea una camada antes de añadir cachorros.</Text>
            <Button title="Abrir camadas" onPress={() => router.push('/litters')} />
          </View>
        </AppCard>
      ) : null}

      {!puppiesQuery.isLoading && !puppiesQuery.error && litters.length > 0 && puppies.length === 0 ? (
        <AppCard title="Todavía no hay cachorros">
          <View className="gap-4">
            <Text className="text-sm leading-5 text-slate-600">
              {selectedLitterId ? 'Añade el primer cachorro de esta camada.' : 'Añade el primer cachorro de este criadero.'}
            </Text>
            {!isFormOpen ? <Button title="Añadir cachorro" onPress={() => openCreateForm()} /> : null}
          </View>
        </AppCard>
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
    </AppScreen>
  );
}

interface LitterFilterProps {
  litters: Litter[];
  selectedLitterId: string;
  onChange: (litterId: string) => void;
}

function LitterFilter({ litters, selectedLitterId, onChange }: LitterFilterProps) {
  return (
    <AppCard title="Filtro de camada">
      <View className="flex-row flex-wrap gap-2">
        <FilterOption label="Todas las camadas" isSelected={!selectedLitterId} onPress={() => onChange('')} />
        {litters.map((litter) => (
          <FilterOption
            key={litter.id}
            label={litter.name}
            isSelected={selectedLitterId === litter.id}
            onPress={() => onChange(litter.id)}
          />
        ))}
      </View>
    </AppCard>
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
  const litterName = littersById.get(puppy.litter_id)?.name ?? 'Camada desconocida';
  const details = [
    `Camada ${litterName}`,
    getPuppySexLabel(puppy.sex),
    getPuppyStatusLabel(puppy.status),
    puppy.color,
    puppy.birth_weight !== null ? `Peso al nacer ${puppy.birth_weight}` : null,
  ].filter(Boolean);

  return (
    <AppCard>
      <View className="gap-3">
        <View className="gap-1">
          <Text className="text-xl font-semibold text-slate-950">{puppy.name}</Text>
          <Text className="text-sm leading-5 text-slate-600">{details.join(' | ') || 'Sin detalles todavía'}</Text>
        </View>

        {puppy.notes ? <Text className="text-sm leading-5 text-slate-600">{puppy.notes}</Text> : null}

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
  return 'Algo ha ido mal al gestionar los cachorros.';
}
