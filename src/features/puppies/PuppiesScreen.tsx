import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Pressable, Text, View } from 'react-native';

import { AppCard, AppScreen, Button, EmptyState, LoadingState, ScreenHeader } from '../../components';
import { ProtectedRoute } from '../auth';
import { getClientFullName, useClients, type Client } from '../clients';
import { useCurrentKennel } from '../kennels';
import { useLitters, type Litter } from '../litters';
import { getReservationStatusLabel, type Reservation } from '../reservations/types';
import { useReservations } from '../reservations/useReservations';
import { PuppyForm } from './PuppyForm';
import { getPuppySexLabel, getPuppyStatusLabel, type Puppy, type PuppyMutationInput } from './types';
import { useCreatePuppy, useDeletePuppy, usePuppies, useUpdatePuppy } from './usePuppies';

const BREEDER_RECOMMENDATIONS_URL = 'https://www.sgservice.es/clinica-veterinaria-san-cristobal/';

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
  const clientsQuery = useClients(kennelId);
  const reservationsQuery = useReservations(kennelId);
  const createPuppyMutation = useCreatePuppy(kennelId);
  const updatePuppyMutation = useUpdatePuppy(kennelId);
  const deletePuppyMutation = useDeletePuppy(kennelId);
  const [editingPuppy, setEditingPuppy] = useState<Puppy | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(initialMode === 'create');
  const [createDefaultLitterId, setCreateDefaultLitterId] = useState(
    initialMode === 'create' ? initialLitterId ?? '' : '',
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [screenError, setScreenError] = useState<string | null>(null);
  const puppies = puppiesQuery.data ?? [];
  const litters = littersQuery.data ?? [];
  const clients = clientsQuery.data ?? [];
  const reservations = reservationsQuery.data ?? [];
  const littersById = useMemo(() => new Map(litters.map((litter) => [litter.id, litter])), [litters]);
  const clientsById = useMemo(() => new Map(clients.map((client) => [client.id, client])), [clients]);
  const reservationsByPuppyId = useMemo(() => {
    const map = new Map<string, Reservation>();

    reservations.forEach((reservation) => {
      const current = map.get(reservation.puppy_id);

      if (!current || (!isActiveReservation(current) && isActiveReservation(reservation))) {
        map.set(reservation.puppy_id, reservation);
      }
    });

    return map;
  }, [reservations]);
  const isOwner = currentMembership?.role === 'owner';
  const isFormSubmitting = createPuppyMutation.isPending || updatePuppyMutation.isPending;
  const fallbackLitterId = selectedLitterId || (litters.length === 1 ? litters[0]?.id ?? '' : '');
  const defaultLitterId = editingPuppy ? editingPuppy.litter_id : createDefaultLitterId || fallbackLitterId;
  const isCreateRoute = initialMode === 'create';
  const isLoading = puppiesQuery.isLoading || littersQuery.isLoading || clientsQuery.isLoading;
  const isPuppyDetailRoute = Boolean(initialPuppyId);
  const detailPuppy = isPuppyDetailRoute ? puppies.find((item) => item.id === initialPuppyId) ?? null : null;
  const detailReservation = detailPuppy ? reservationsByPuppyId.get(detailPuppy.id) : undefined;

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

    if (isCreateRoute) {
      router.replace('/puppies' as never);
    }
  };

  useEffect(() => {
    if (initialLitterId) {
      setSelectedLitterId(initialLitterId);
    }
  }, [initialLitterId]);

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

  const handleOpenBreederRecommendation = async () => {
    try {
      await Linking.openURL(BREEDER_RECOMMENDATIONS_URL);
    } catch {
      Alert.alert(
        'No se ha podido abrir el enlace',
        'Inténtalo de nuevo o abre la web de SG Service desde el navegador.',
      );
    }
  };

  if (isPuppyDetailRoute) {
    return (
      <AppScreen scrollable>
        <ScreenHeader
          title={detailPuppy?.name || 'Detalle del cachorro'}
          subtitle="Perfil del cachorro y recomendaciones para su adaptación."
          action={<Button title="Volver" variant="secondary" onPress={() => router.replace('/puppies' as never)} />}
        />

        {screenError ? (
          <AppCard className="border-red-200 bg-red-50">
            <Text className="text-sm leading-5 text-red-600">{screenError}</Text>
          </AppCard>
        ) : null}

        {isLoading ? <LoadingState title="Cargando cachorro" message="Preparando el perfil del cachorro." /> : null}

        {puppiesQuery.error ? (
          <AppCard title="No se ha podido cargar el cachorro" className="border-red-200 bg-red-50">
            <Text className="text-sm leading-5 text-red-600">{getErrorMessage(puppiesQuery.error)}</Text>
          </AppCard>
        ) : null}

        {!isLoading && !puppiesQuery.error && !detailPuppy ? (
          <EmptyState
            title="Cachorro no encontrado"
            message="No se ha encontrado este cachorro en el criadero actual."
            actionLabel="Volver a cachorros"
            onAction={() => router.replace('/puppies' as never)}
          />
        ) : null}

        {detailPuppy ? (
          <>
            <PuppyProfileCard
              clientsById={clientsById}
              isDeleting={deletePuppyMutation.isPending}
              isOwner={isOwner}
              littersById={littersById}
              puppy={detailPuppy}
              reservation={detailReservation}
              onDelete={() => handleDeletePuppy(detailPuppy)}
              onDocuments={() => router.push(`/documents?entityType=puppy&entityId=${detailPuppy.id}` as never)}
              onEdit={() => openEditForm(detailPuppy)}
              onHealth={() => router.push(`/health/puppies/${detailPuppy.id}` as never)}
              onOwnerPreview={() => router.push(`/puppies/${detailPuppy.id}/owner-preview` as never)}
              onReservation={() =>
                detailReservation
                  ? router.push(`/reservations/${detailReservation.id}` as never)
                  : router.push(`/reservations/new?puppyId=${detailPuppy.id}` as never)
              }
            />

            {isFormOpen ? (
              <PuppyForm
                clients={clients}
                defaultLitterId={defaultLitterId}
                litters={litters}
                puppy={editingPuppy}
                errorMessage={formError}
                isSubmitting={isFormSubmitting}
                onCancel={closeForm}
                onSubmit={handleSubmitPuppy}
              />
            ) : null}

            <BreederRecommendationsSection onOpenRecommendation={handleOpenBreederRecommendation} />
          </>
        ) : null}
      </AppScreen>
    );
  }

  return (
    <AppScreen scrollable>
      <ScreenHeader
        title="Cachorros"
        subtitle={`Registro de cachorros de ${currentKennel?.name ?? 'criadero'}`}
        action={
          <Button
            title={isFormOpen ? 'Cerrar' : 'Añadir cachorro'}
            variant={isFormOpen ? 'secondary' : 'primary'}
            onPress={isFormOpen ? closeForm : () => openCreateForm()}
          />
        }
      />

      {screenError ? (
        <AppCard className="border-red-200 bg-red-50">
          <Text className="text-sm leading-5 text-red-600">{screenError}</Text>
        </AppCard>
      ) : null}

      {littersQuery.error ? (
        <AppCard title="No se han podido cargar las camadas" className="border-red-200 bg-red-50">
          <Text className="text-sm leading-5 text-red-600">{getErrorMessage(littersQuery.error)}</Text>
        </AppCard>
      ) : null}

      {clientsQuery.error ? (
        <AppCard title="No se han podido cargar los clientes" className="border-red-200 bg-red-50">
          <Text className="text-sm leading-5 text-red-600">{getErrorMessage(clientsQuery.error)}</Text>
        </AppCard>
      ) : null}

      {litters.length > 0 ? (
        <LitterFilter litters={litters} selectedLitterId={selectedLitterId} onChange={setSelectedLitterId} />
      ) : null}

      {isFormOpen ? (
        <PuppyForm
          clients={clients}
          defaultLitterId={defaultLitterId}
          litters={litters}
          puppy={editingPuppy}
          errorMessage={formError}
          isSubmitting={isFormSubmitting}
          onCancel={closeForm}
          onSubmit={handleSubmitPuppy}
        />
      ) : null}

      {isLoading ? <LoadingState title="Cargando cachorros" message="Preparando cachorros, camadas y clientes." /> : null}

      {puppiesQuery.error ? (
        <AppCard title="No se han podido cargar los cachorros" className="border-red-200 bg-red-50">
          <Text className="text-sm leading-5 text-red-600">{getErrorMessage(puppiesQuery.error)}</Text>
        </AppCard>
      ) : null}

      {!littersQuery.isLoading && !littersQuery.error && litters.length === 0 ? (
        <EmptyState
          title="Todavía no hay camadas"
          message="Crea una camada antes de añadir cachorros."
          actionLabel="Abrir camadas"
          onAction={() => router.push('/litters' as never)}
        />
      ) : null}

      {!puppiesQuery.isLoading && !puppiesQuery.error && litters.length > 0 && puppies.length === 0 ? (
        <EmptyState
          title="Todavía no hay cachorros"
          message={selectedLitterId ? 'Añade el primer cachorro de esta camada.' : 'Añade el primer cachorro del criadero.'}
          actionLabel={!isFormOpen ? 'Añadir cachorro' : undefined}
          onAction={!isFormOpen ? () => openCreateForm() : undefined}
        />
      ) : null}

      {puppies.length > 0 ? (
        <View className="gap-3">
          <Text className="text-sm font-semibold text-muted">
            {puppies.length === 1 ? '1 cachorro registrado' : `${puppies.length} cachorros registrados`}
          </Text>
          {puppies.map((puppy) => {
            const reservation = reservationsByPuppyId.get(puppy.id);

            return (
              <PuppyCard
                clientsById={clientsById}
                isDeleting={deletePuppyMutation.isPending}
                isOwner={isOwner}
                key={puppy.id}
                littersById={littersById}
                puppy={puppy}
                reservation={reservation}
                onDelete={() => handleDeletePuppy(puppy)}
                onDetail={() => router.push(`/puppies/${puppy.id}` as never)}
                onDocuments={() => router.push(`/documents?entityType=puppy&entityId=${puppy.id}` as never)}
                onEdit={() => openEditForm(puppy)}
                onHealth={() => router.push(`/health/puppies/${puppy.id}` as never)}
                onReservation={() =>
                  reservation
                    ? router.push(`/reservations/${reservation.id}` as never)
                    : router.push(`/reservations/new?puppyId=${puppy.id}` as never)
                }
              />
            );
          })}
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
    <AppCard title="Filtrar por camada">
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
  clientsById: Map<string, Client>;
  isDeleting: boolean;
  isOwner: boolean;
  littersById: Map<string, Litter>;
  puppy: Puppy;
  reservation?: Reservation;
  onDelete: () => void;
  onDetail: () => void;
  onDocuments: () => void;
  onEdit: () => void;
  onHealth: () => void;
  onReservation: () => void;
}

function PuppyCard({
  clientsById,
  isDeleting,
  isOwner,
  littersById,
  puppy,
  reservation,
  onDelete,
  onDetail,
  onDocuments,
  onEdit,
  onHealth,
  onReservation,
}: PuppyCardProps) {
  const litterName = littersById.get(puppy.litter_id)?.name ?? 'Camada desconocida';
  const client = puppy.client_id ? clientsById.get(puppy.client_id) : null;
  const clientName = client ? getClientFullName(client) : null;
  const birthDate = puppy.birth_date ? formatIsoDate(puppy.birth_date) : null;

  return (
    <AppCard className="p-0">
      <View className="gap-4 p-4">
        <View className="flex-row gap-3">
          <Avatar name={puppy.name} />

          <View className="min-w-0 flex-1 gap-2">
            <View className="gap-1">
              <Text className="text-xl font-semibold text-ink" numberOfLines={1}>
                {puppy.name || 'Cachorro sin nombre'}
              </Text>
              <Text className="text-sm leading-5 text-muted" numberOfLines={1}>
                Camada {litterName}
              </Text>
            </View>

            <View className="flex-row flex-wrap gap-2">
              <Badge label={getPuppyStatusLabel(puppy.status)} tone={getStatusTone(puppy.status)} />
              <Badge label={getPuppySexLabel(puppy.sex)} />
              {birthDate ? <Badge label={`Nacimiento ${birthDate}`} /> : null}
              {reservation ? <Badge label={`Reserva ${getReservationStatusLabel(reservation.status)}`} tone="accent" /> : null}
            </View>
          </View>
        </View>

        <View className="gap-2 border-t border-border pt-4">
          <InfoLine label="Camada" value={litterName} />
          {birthDate ? <InfoLine label="Nacimiento" value={birthDate} /> : null}
          {puppy.color ? <InfoLine label="Color" value={puppy.color} /> : null}
          {clientName ? <InfoLine label="Cliente" value={clientName} /> : null}
          {!birthDate && !puppy.color && !clientName && !puppy.notes ? (
            <Text className="text-sm leading-5 text-muted">Sin detalles adicionales todavía.</Text>
          ) : null}
          {puppy.notes ? (
            <Text className="text-sm leading-5 text-muted" numberOfLines={3}>
              {puppy.notes}
            </Text>
          ) : null}
        </View>

        <View className="gap-3">
          <Button title="Ver detalle" variant="secondary" onPress={onDetail} />
          <Button title="Salud" variant="secondary" onPress={onHealth} />
          <View className="flex-row gap-3">
            <Button title="Documentos" variant="secondary" className="flex-1" onPress={onDocuments} />
            <Button title="Editar" variant="secondary" className="flex-1" onPress={onEdit} />
          </View>
          <Button
            title={reservation ? 'Ver reserva' : 'Reservar cachorro'}
            variant="secondary"
            onPress={onReservation}
          />
          {isOwner ? (
            <Button
              title="Eliminar cachorro"
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

interface PuppyProfileCardProps {
  clientsById: Map<string, Client>;
  isDeleting: boolean;
  isOwner: boolean;
  littersById: Map<string, Litter>;
  puppy: Puppy;
  reservation?: Reservation;
  onDelete: () => void;
  onDocuments: () => void;
  onEdit: () => void;
  onHealth: () => void;
  onOwnerPreview: () => void;
  onReservation: () => void;
}

function PuppyProfileCard({
  clientsById,
  isDeleting,
  isOwner,
  littersById,
  puppy,
  reservation,
  onDelete,
  onDocuments,
  onEdit,
  onHealth,
  onOwnerPreview,
  onReservation,
}: PuppyProfileCardProps) {
  const litterName = littersById.get(puppy.litter_id)?.name ?? 'Camada desconocida';
  const client = puppy.client_id ? clientsById.get(puppy.client_id) : null;
  const clientName = client ? getClientFullName(client) : null;
  const birthDate = puppy.birth_date ? formatIsoDate(puppy.birth_date) : 'Sin fecha registrada';

  return (
    <AppCard>
      <View className="gap-4">
        <View className="flex-row gap-3">
          <Avatar name={puppy.name} />

          <View className="min-w-0 flex-1 gap-2">
            <View className="gap-1">
              <Text className="text-xl font-semibold text-ink" numberOfLines={1}>
                {puppy.name || 'Cachorro sin nombre'}
              </Text>
              <Text className="text-sm leading-5 text-muted" numberOfLines={1}>
                Camada {litterName}
              </Text>
            </View>

            <View className="flex-row flex-wrap gap-2">
              <Badge label={getPuppyStatusLabel(puppy.status)} tone={getStatusTone(puppy.status)} />
              <Badge label={getPuppySexLabel(puppy.sex)} />
              {reservation ? <Badge label={`Reserva ${getReservationStatusLabel(reservation.status)}`} tone="accent" /> : null}
            </View>
          </View>
        </View>

        <View className="gap-2 border-t border-border pt-4">
          <InfoLine label="Nombre" value={puppy.name || 'Cachorro sin nombre'} />
          <InfoLine label="Camada" value={litterName} />
          <InfoLine label="Nacimiento" value={birthDate} />
          <InfoLine label="Estado" value={getPuppyStatusLabel(puppy.status)} />
          {clientName ? <InfoLine label="Cliente asignado" value={clientName} /> : null}
          {puppy.color ? <InfoLine label="Color" value={puppy.color} /> : null}
          {puppy.notes ? (
            <Text className="text-sm leading-5 text-muted" numberOfLines={4}>
              {puppy.notes}
            </Text>
          ) : null}
        </View>

        <View className="gap-3">
          <Button title="Vista propietario" onPress={onOwnerPreview} />
          <Button title="Salud" variant="secondary" onPress={onHealth} />
          <View className="flex-row gap-3">
            <Button title="Documentos" variant="secondary" className="flex-1" onPress={onDocuments} />
            <Button title="Editar" variant="secondary" className="flex-1" onPress={onEdit} />
          </View>
          <Button
            title={reservation ? 'Ver reserva' : 'Reservar cachorro'}
            variant="secondary"
            onPress={onReservation}
          />
          {isOwner ? (
            <Button
              title="Eliminar cachorro"
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

interface BreederRecommendationsSectionProps {
  onOpenRecommendation: () => void;
}

function BreederRecommendationsSection({ onOpenRecommendation }: BreederRecommendationsSectionProps) {
  return (
    <View className="gap-3">
      <Text className="text-xl font-semibold text-ink">Recomendaciones del criador</Text>

      <RecommendationCard
        actionLabel="Comprar alimentación"
        body="Mantén la alimentación recomendada por tu criador durante la adaptación del cachorro."
        product="Dibaq Sense Puppy"
        title="Alimentación recomendada"
        eyebrow="Alimentación recomendada por el criador"
        onPress={onOpenRecommendation}
      />

      <RecommendationCard
        actionLabel="Ver seguro"
        body="Consulta la opción de seguro recomendada para proteger la salud de tu cachorro."
        product="Seguro Veterinario Premium"
        title="Seguro recomendado"
        eyebrow="Seguro veterinario recomendado"
        onPress={onOpenRecommendation}
      />
    </View>
  );
}

interface RecommendationCardProps {
  actionLabel: string;
  body: string;
  eyebrow: string;
  product: string;
  title: string;
  onPress: () => void;
}

function RecommendationCard({ actionLabel, body, eyebrow, product, title, onPress }: RecommendationCardProps) {
  return (
    <AppCard title={title}>
      <View className="gap-3">
        <View className="gap-1">
          <Text className="text-sm font-semibold text-brand-700">{eyebrow}</Text>
          <Text className="text-lg font-semibold text-ink">{product}</Text>
          <Text className="text-sm leading-5 text-muted">{body}</Text>
        </View>
        <Button title={actionLabel} onPress={onPress} />
      </View>
    </AppCard>
  );
}

interface BadgeProps {
  label: string;
  tone?: 'brand' | 'accent' | 'neutral' | 'danger';
}

function Badge({ label, tone = 'neutral' }: BadgeProps) {
  const containerClass =
    tone === 'brand'
      ? 'border-brand-100 bg-brand-50'
      : tone === 'accent'
        ? 'border-accent-500 bg-accent-50'
        : tone === 'danger'
          ? 'border-red-200 bg-red-50'
          : 'border-border bg-slate-50';
  const textClass =
    tone === 'brand'
      ? 'text-brand-700'
      : tone === 'accent'
        ? 'text-accent-600'
        : tone === 'danger'
          ? 'text-red-600'
          : 'text-muted';

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
    <View className="h-16 w-16 items-center justify-center rounded-lg border border-brand-100 bg-brand-50">
      <Text className="text-xl font-bold text-brand-700">{getInitials(name)}</Text>
    </View>
  );
}

function getInitials(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  return initials || 'C';
}

function getStatusTone(status: Puppy['status']): BadgeProps['tone'] {
  if (status === 'available' || status === 'keeper') {
    return 'brand';
  }

  if (status === 'reserved' || status === 'sold') {
    return 'accent';
  }

  if (status === 'deceased') {
    return 'danger';
  }

  return 'neutral';
}

function formatIsoDate(value: string) {
  const [year, month, day] = value.split('-');

  return year && month && day ? `${day}/${month}/${year}` : value;
}

function getErrorMessage(_error: unknown) {
  return 'Algo ha ido mal al gestionar los cachorros.';
}

function isActiveReservation(reservation: Reservation) {
  return reservation.status === 'pending' || reservation.status === 'paid';
}
