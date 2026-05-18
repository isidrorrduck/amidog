import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, Pressable, Text, View } from 'react-native';

import { Button, AppCard, AppScreen } from '../../components';
import { ProtectedRoute } from '../auth';
import { useCurrentKennel } from '../kennels';
import { PromotionForm } from './PromotionForm';
import {
  getPromotionScopeLabel,
  getPromotionTypeLabel,
  promotionScopeOptions,
  promotionTypeOptions,
  type Promotion,
  type PromotionFilters,
  type PromotionMutationInput,
  type PromotionScope,
  type PromotionType,
} from './types';
import {
  useCreatePromotion,
  useDeletePromotion,
  usePromotion,
  usePromotions,
  useUpdatePromotion,
} from './usePromotions';

interface PromotionsScreenProps {
  initialMode?: 'create';
  initialPromotionId?: string | null;
}

export function PromotionsScreen(props: PromotionsScreenProps = {}) {
  return (
    <ProtectedRoute>
      <PromotionsContent {...props} />
    </ProtectedRoute>
  );
}

function PromotionsContent({ initialMode, initialPromotionId }: PromotionsScreenProps) {
  const { currentKennel, currentMembership } = useCurrentKennel();
  const kennelId = currentKennel?.id ?? null;
  const [selectedPromotionType, setSelectedPromotionType] = useState<PromotionType | ''>('');
  const [selectedScope, setSelectedScope] = useState<PromotionScope>('all');
  const filters = useMemo<PromotionFilters>(
    () => ({
      promotionType: selectedPromotionType || null,
      scope: selectedScope,
    }),
    [selectedPromotionType, selectedScope],
  );
  const promotionsQuery = usePromotions(kennelId, filters);
  const promotionQuery = usePromotion(kennelId, initialPromotionId);
  const createPromotionMutation = useCreatePromotion(kennelId);
  const updatePromotionMutation = useUpdatePromotion(kennelId);
  const deletePromotionMutation = useDeletePromotion(kennelId);
  const [isFormOpen, setIsFormOpen] = useState(initialMode === 'create' || Boolean(initialPromotionId));
  const [formError, setFormError] = useState<string | null>(null);
  const [screenError, setScreenError] = useState<string | null>(null);
  const promotions = initialPromotionId ? (promotionQuery.data ? [promotionQuery.data] : []) : promotionsQuery.data ?? [];
  const activePromotionsQuery = initialPromotionId ? promotionQuery : promotionsQuery;
  const editingPromotion = initialPromotionId && promotionQuery.data && !promotionQuery.data.is_global
    ? promotionQuery.data
    : null;
  const isOwner = currentMembership?.role === 'owner';
  const isRouteForm = initialMode === 'create' || Boolean(initialPromotionId);
  const isFormSubmitting = createPromotionMutation.isPending || updatePromotionMutation.isPending;
  const hasActiveFilters = Boolean(selectedPromotionType || selectedScope !== 'all');

  const closeForm = () => {
    setFormError(null);
    setIsFormOpen(false);

    if (isRouteForm) {
      router.replace('/promotions' as never);
    }
  };

  const handleSubmitPromotion = async (input: PromotionMutationInput) => {
    setFormError(null);

    try {
      if (editingPromotion) {
        await updatePromotionMutation.mutateAsync({ promotionId: editingPromotion.id, input });
      } else {
        await createPromotionMutation.mutateAsync(input);
      }

      closeForm();
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  };

  const handleDeletePromotion = (promotion: Promotion) => {
    Alert.alert('¿Eliminar promoción?', `Se eliminará ${promotion.title} de ${currentKennel?.name ?? 'este criadero'}.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          void deletePromotionMutation.mutateAsync(promotion.id).catch((error) => {
            setScreenError(getErrorMessage(error));
          });
        },
      },
    ]);
  };

  const handleOpenLink = async (url: string) => {
    setScreenError(null);

    try {
      await Linking.openURL(url);
    } catch (error) {
      setScreenError(getErrorMessage(error));
    }
  };

  return (
    <AppScreen scrollable>
      <View className="gap-2">
        <Text className="text-3xl font-bold text-slate-950">Promociones</Text>
        <Text className="text-base leading-6 text-slate-600">
          Recomendaciones, campañas y mensajes comerciales de {currentKennel?.name ?? 'criadero'}
        </Text>
      </View>

      <Button
        title={isFormOpen ? 'Cerrar formulario' : 'Crear promoción'}
        variant={isFormOpen ? 'secondary' : 'primary'}
        onPress={isFormOpen ? closeForm : () => router.push('/promotions/new' as never)}
      />

      {screenError ? (
        <AppCard>
          <Text className="text-sm leading-5 text-red-600">{screenError}</Text>
        </AppCard>
      ) : null}

      {!initialPromotionId ? (
        <PromotionFiltersCard
          selectedPromotionType={selectedPromotionType}
          selectedScope={selectedScope}
          onChangePromotionType={setSelectedPromotionType}
          onChangeScope={setSelectedScope}
        />
      ) : null}

      {isFormOpen && (!initialPromotionId || editingPromotion) ? (
        <PromotionForm
          promotion={editingPromotion}
          errorMessage={formError}
          isSubmitting={isFormSubmitting}
          onCancel={closeForm}
          onSubmit={handleSubmitPromotion}
        />
      ) : null}

      {isFormOpen && initialPromotionId && promotionQuery.data?.is_global ? (
        <AppCard title="Promoción global">
          <View className="gap-4">
            <Text className="text-sm leading-5 text-slate-600">Las promociones globales las gestiona SG Service.</Text>
            <Button title="Volver a promociones" variant="secondary" onPress={closeForm} />
          </View>
        </AppCard>
      ) : null}

      {activePromotionsQuery.isLoading ? (
        <AppCard title="Cargando promociones">
          <View className="items-start">
            <ActivityIndicator color="#1d4ed8" />
          </View>
        </AppCard>
      ) : null}

      {activePromotionsQuery.error ? (
        <AppCard title="No se han podido cargar las promociones">
          <Text className="text-sm leading-5 text-red-600">{getErrorMessage(activePromotionsQuery.error)}</Text>
        </AppCard>
      ) : null}

      {!activePromotionsQuery.isLoading && !activePromotionsQuery.error && promotions.length === 0 ? (
        <AppCard title={initialPromotionId ? 'Promoción no encontrada' : hasActiveFilters ? 'No hay promociones que coincidan' : 'Todavía no hay promociones'}>
          <View className="gap-4">
            <Text className="text-sm leading-5 text-slate-600">
              {initialPromotionId
                ? 'Esta promoción no está disponible en el criadero actual.'
                : hasActiveFilters
                  ? 'Cambia los filtros para ver más promociones.'
                  : 'Crea la primera promoción del criadero.'}
            </Text>
            {!initialPromotionId && !isFormOpen && !hasActiveFilters ? (
              <Button title="Crear promoción" onPress={() => router.push('/promotions/new' as never)} />
            ) : null}
          </View>
        </AppCard>
      ) : null}

      {promotions.length > 0 ? (
        <View className="gap-3">
          {promotions.map((promotion) => (
            <PromotionCard
              isDeleting={deletePromotionMutation.isPending}
              isOwner={isOwner}
              key={promotion.id}
              promotion={promotion}
              showDetails={!initialPromotionId}
              onDelete={() => handleDeletePromotion(promotion)}
              onEdit={() => router.push(`/promotions/${promotion.id}` as never)}
              onOpenLink={(url) => void handleOpenLink(url)}
            />
          ))}
        </View>
      ) : null}
    </AppScreen>
  );
}

interface PromotionFiltersCardProps {
  selectedPromotionType: PromotionType | '';
  selectedScope: PromotionScope;
  onChangePromotionType: (promotionType: PromotionType | '') => void;
  onChangeScope: (scope: PromotionScope) => void;
}

function PromotionFiltersCard({
  selectedPromotionType,
  selectedScope,
  onChangePromotionType,
  onChangeScope,
}: PromotionFiltersCardProps) {
  return (
    <AppCard title="Filtros">
      <View className="gap-4">
        <FilterSection label="Alcance">
          {promotionScopeOptions.map((scope) => (
            <FilterOption
              key={scope}
              label={getPromotionScopeLabel(scope)}
              isSelected={selectedScope === scope}
              onPress={() => onChangeScope(scope)}
            />
          ))}
        </FilterSection>

        <FilterSection label="Tipo">
          <FilterOption label="Todos los tipos" isSelected={!selectedPromotionType} onPress={() => onChangePromotionType('')} />
          {promotionTypeOptions.map((promotionType) => (
            <FilterOption
              key={promotionType}
              label={getPromotionTypeLabel(promotionType)}
              isSelected={selectedPromotionType === promotionType}
              onPress={() => onChangePromotionType(promotionType)}
            />
          ))}
        </FilterSection>
      </View>
    </AppCard>
  );
}

interface FilterSectionProps {
  children: ReactNode;
  label: string;
}

function FilterSection({ children, label }: FilterSectionProps) {
  return (
    <View className="gap-2">
      <Text className="text-sm font-semibold text-slate-700">{label}</Text>
      <View className="flex-row flex-wrap gap-2">{children}</View>
    </View>
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

interface PromotionCardProps {
  isDeleting: boolean;
  isOwner: boolean;
  promotion: Promotion;
  showDetails: boolean;
  onDelete: () => void;
  onEdit: () => void;
  onOpenLink: (url: string) => void;
}

function PromotionCard({
  isDeleting,
  isOwner,
  promotion,
  showDetails,
  onDelete,
  onEdit,
  onOpenLink,
}: PromotionCardProps) {
  const details = [
    promotion.is_global ? 'Global' : 'Criadero',
    getPromotionTypeLabel(promotion.promotion_type),
    `Creada ${formatDate(promotion.created_at)}`,
  ];
  const canManage = !promotion.is_global;
  const canDelete = canManage && isOwner;

  return (
    <AppCard>
      <View className="gap-3">
        {promotion.image_url ? (
          <Image
            source={{ uri: promotion.image_url }}
            resizeMode="cover"
            className="h-40 w-full rounded-lg bg-slate-100"
          />
        ) : null}

        <View className="gap-1">
          <Text className="text-xl font-semibold text-slate-950">{promotion.title}</Text>
          <Text className="text-sm leading-5 text-slate-600">{details.join(' | ')}</Text>
        </View>

        <Text className="text-sm leading-5 text-slate-600">{promotion.message}</Text>

        {promotion.action_url ? (
          <Button title="Abrir enlace" variant="secondary" onPress={() => onOpenLink(promotion.action_url!)} />
        ) : null}

        {(showDetails && canManage) || canDelete ? (
          <View className="flex-row gap-3">
            {showDetails && canManage ? (
              <Button title="Editar" variant="secondary" className="flex-1" onPress={onEdit} />
            ) : null}
            {canDelete ? (
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
        ) : null}
      </View>
    </AppCard>
  );
}

function formatDate(value: string) {
  return value.slice(0, 10);
}

function getErrorMessage(_error: unknown) {
  return 'Algo ha ido mal al gestionar las promociones.';
}
