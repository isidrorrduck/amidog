import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';

import { Button, AppCard, AppScreen } from '../../components';
import { ProtectedRoute } from '../auth';
import { getClientFullName, useClients, type Client } from '../clients';
import { useCurrentKennel } from '../kennels';
import { useLitters, type Litter } from '../litters';
import { usePuppies, type Puppy } from '../puppies';
import { ReservationForm } from './ReservationForm';
import {
  getReservationStatusLabel,
  reservationStatusOptions,
  type Reservation,
  type ReservationFilters,
  type ReservationMutationInput,
  type ReservationStatus,
} from './types';
import {
  useCreateReservation,
  useDeleteReservation,
  useReservations,
  useUpdateReservation,
} from './useReservations';

interface ReservationsScreenProps {
  initialClientId?: string | null;
  initialMode?: 'create';
  initialPuppyId?: string | null;
  initialReservationId?: string | null;
}

export function ReservationsScreen(props: ReservationsScreenProps = {}) {
  return (
    <ProtectedRoute>
      <ReservationsContent {...props} />
    </ProtectedRoute>
  );
}

function ReservationsContent({
  initialClientId,
  initialMode,
  initialPuppyId,
  initialReservationId,
}: ReservationsScreenProps) {
  const { currentKennel, currentMembership } = useCurrentKennel();
  const kennelId = currentKennel?.id ?? null;
  const [selectedStatus, setSelectedStatus] = useState<ReservationStatus | ''>('');
  const [selectedPuppyId, setSelectedPuppyId] = useState(initialPuppyId ?? '');
  const [selectedClientId, setSelectedClientId] = useState(initialClientId ?? '');
  const filters = useMemo<ReservationFilters>(
    () => ({
      status: selectedStatus || null,
      puppyId: selectedPuppyId || null,
      clientId: selectedClientId || null,
    }),
    [selectedClientId, selectedPuppyId, selectedStatus],
  );
  const reservationsQuery = useReservations(kennelId, filters);
  const puppiesQuery = usePuppies(kennelId);
  const clientsQuery = useClients(kennelId);
  const littersQuery = useLitters(kennelId);
  const createReservationMutation = useCreateReservation(kennelId);
  const updateReservationMutation = useUpdateReservation(kennelId);
  const deleteReservationMutation = useDeleteReservation(kennelId);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(initialMode === 'create');
  const createDefaultPuppyId = initialMode === 'create' ? initialPuppyId ?? '' : '';
  const createDefaultClientId = initialMode === 'create' ? initialClientId ?? '' : '';
  const [formError, setFormError] = useState<string | null>(null);
  const [screenError, setScreenError] = useState<string | null>(null);
  const reservations = reservationsQuery.data ?? [];
  const puppies = puppiesQuery.data ?? [];
  const clients = clientsQuery.data ?? [];
  const litters = littersQuery.data ?? [];
  const puppiesById = useMemo(() => new Map(puppies.map((puppy) => [puppy.id, puppy])), [puppies]);
  const clientsById = useMemo(() => new Map(clients.map((client) => [client.id, client])), [clients]);
  const littersById = useMemo(() => new Map(litters.map((litter) => [litter.id, litter])), [litters]);
  const isOwner = currentMembership?.role === 'owner';
  const isFormSubmitting = createReservationMutation.isPending || updateReservationMutation.isPending;
  const isRouteForm = initialMode === 'create' || Boolean(initialReservationId);
  const relationError = clientsQuery.error ?? puppiesQuery.error ?? littersQuery.error ?? null;
  const hasActiveFilters = Boolean(selectedStatus || selectedPuppyId || selectedClientId);
  const defaultPuppyId = editingReservation
    ? editingReservation.puppy_id
    : createDefaultPuppyId || selectedPuppyId || (puppies.length === 1 ? puppies[0]?.id ?? '' : '');
  const defaultClientId = editingReservation
    ? editingReservation.client_id
    : createDefaultClientId || selectedClientId || (clients.length === 1 ? clients[0]?.id ?? '' : '');

  useEffect(() => {
    if (initialPuppyId) {
      setSelectedPuppyId(initialPuppyId);
    }
  }, [initialPuppyId]);

  useEffect(() => {
    if (initialClientId) {
      setSelectedClientId(initialClientId);
    }
  }, [initialClientId]);

  useEffect(() => {
    if (!initialReservationId || editingReservation || reservationsQuery.isLoading) {
      return;
    }

    const reservation = reservations.find((item) => item.id === initialReservationId);

    if (reservation) {
      openEditForm(reservation);
    } else if (!reservationsQuery.error) {
      setScreenError('Unable to find this reservation in the current kennel.');
    }
  }, [editingReservation, initialReservationId, reservations, reservationsQuery.error, reservationsQuery.isLoading]);

  const openEditForm = (reservation: Reservation) => {
    setEditingReservation(reservation);
    setFormError(null);
    setScreenError(null);
    createReservationMutation.reset();
    updateReservationMutation.reset();
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setEditingReservation(null);
    setFormError(null);
    setIsFormOpen(false);

    if (isRouteForm) {
      router.replace('/reservations' as never);
    }
  };

  const handleSubmitReservation = async (input: ReservationMutationInput) => {
    setFormError(null);

    try {
      if (editingReservation) {
        await updateReservationMutation.mutateAsync({ reservationId: editingReservation.id, input });
      } else {
        await createReservationMutation.mutateAsync(input);
      }

      closeForm();
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  };

  const handleDeleteReservation = (reservation: Reservation) => {
    const puppyName = puppiesById.get(reservation.puppy_id)?.name ?? 'This reservation';
    const clientName = getClientLabel(clientsById.get(reservation.client_id));

    Alert.alert('Delete reservation?', `${puppyName} for ${clientName} will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void deleteReservationMutation.mutateAsync(reservation.id).catch((error) => {
            setScreenError(getErrorMessage(error));
          });
        },
      },
    ]);
  };

  return (
    <AppScreen scrollable>
      <View className="gap-2">
        <Text className="text-3xl font-bold text-slate-950">Reservations</Text>
        <Text className="text-base leading-6 text-slate-600">
          {currentKennel?.name ?? 'Kennel'} puppy reservation board
        </Text>
      </View>

      <Button
        title={isFormOpen ? 'Close form' : 'Create reservation'}
        variant={isFormOpen ? 'secondary' : 'primary'}
        onPress={isFormOpen ? closeForm : () => router.push('/reservations/new' as never)}
      />

      {screenError ? (
        <AppCard>
          <Text className="text-sm leading-5 text-red-600">{screenError}</Text>
        </AppCard>
      ) : null}

      {relationError ? (
        <AppCard title="Unable to load reservation data">
          <Text className="text-sm leading-5 text-red-600">{getErrorMessage(relationError)}</Text>
        </AppCard>
      ) : null}

      <ReservationFiltersCard
        clients={clients}
        puppies={puppies}
        selectedClientId={selectedClientId}
        selectedPuppyId={selectedPuppyId}
        selectedStatus={selectedStatus}
        onChangeClient={setSelectedClientId}
        onChangePuppy={setSelectedPuppyId}
        onChangeStatus={setSelectedStatus}
      />

      {isFormOpen ? (
        <ReservationForm
          clients={clients}
          defaultClientId={defaultClientId}
          defaultPuppyId={defaultPuppyId}
          puppies={puppies}
          reservation={editingReservation}
          errorMessage={formError}
          isSubmitting={isFormSubmitting}
          onCancel={closeForm}
          onSubmit={handleSubmitReservation}
        />
      ) : null}

      {reservationsQuery.isLoading || puppiesQuery.isLoading || clientsQuery.isLoading || littersQuery.isLoading ? (
        <AppCard title="Loading reservations">
          <View className="items-start">
            <ActivityIndicator color="#1d4ed8" />
          </View>
        </AppCard>
      ) : null}

      {reservationsQuery.error ? (
        <AppCard title="Unable to load reservations">
          <Text className="text-sm leading-5 text-red-600">{getErrorMessage(reservationsQuery.error)}</Text>
        </AppCard>
      ) : null}

      {!puppiesQuery.isLoading && !puppiesQuery.error && puppies.length === 0 ? (
        <AppCard title="No puppies yet">
          <View className="gap-4">
            <Text className="text-sm leading-5 text-slate-600">Create a puppy before adding reservations.</Text>
            <Button title="Open puppies" onPress={() => router.push('/puppies' as never)} />
          </View>
        </AppCard>
      ) : null}

      {!clientsQuery.isLoading && !clientsQuery.error && clients.length === 0 ? (
        <AppCard title="No clients yet">
          <View className="gap-4">
            <Text className="text-sm leading-5 text-slate-600">Create a client before adding reservations.</Text>
            <Button title="Open clients" onPress={() => router.push('/clients' as never)} />
          </View>
        </AppCard>
      ) : null}

      {!reservationsQuery.isLoading &&
      !reservationsQuery.error &&
      puppies.length > 0 &&
      clients.length > 0 &&
      reservations.length === 0 ? (
        <AppCard title={hasActiveFilters ? 'No matching reservations' : 'No reservations yet'}>
          <View className="gap-4">
            <Text className="text-sm leading-5 text-slate-600">
              {hasActiveFilters ? 'Change the filters to see more reservations.' : 'Create the first puppy reservation.'}
            </Text>
            {!isFormOpen && !hasActiveFilters ? (
              <Button title="Create reservation" onPress={() => router.push('/reservations/new' as never)} />
            ) : null}
          </View>
        </AppCard>
      ) : null}

      {reservations.length > 0 ? (
        <View className="gap-3">
          {reservations.map((reservation) => (
            <ReservationCard
              clientsById={clientsById}
              isDeleting={deleteReservationMutation.isPending}
              isOwner={isOwner}
              key={reservation.id}
              littersById={littersById}
              puppiesById={puppiesById}
              reservation={reservation}
              onDelete={() => handleDeleteReservation(reservation)}
              onEdit={() => router.push(`/reservations/${reservation.id}` as never)}
            />
          ))}
        </View>
      ) : null}
    </AppScreen>
  );
}

interface ReservationFiltersCardProps {
  clients: Client[];
  puppies: Puppy[];
  selectedClientId: string;
  selectedPuppyId: string;
  selectedStatus: ReservationStatus | '';
  onChangeClient: (clientId: string) => void;
  onChangePuppy: (puppyId: string) => void;
  onChangeStatus: (status: ReservationStatus | '') => void;
}

function ReservationFiltersCard({
  clients,
  puppies,
  selectedClientId,
  selectedPuppyId,
  selectedStatus,
  onChangeClient,
  onChangePuppy,
  onChangeStatus,
}: ReservationFiltersCardProps) {
  return (
    <AppCard title="Filters">
      <View className="gap-4">
        <FilterSection label="Status">
          <FilterOption label="All statuses" isSelected={!selectedStatus} onPress={() => onChangeStatus('')} />
          {reservationStatusOptions.map((status) => (
            <FilterOption
              key={status}
              label={getReservationStatusLabel(status)}
              isSelected={selectedStatus === status}
              onPress={() => onChangeStatus(status)}
            />
          ))}
        </FilterSection>

        {puppies.length > 0 ? (
          <FilterSection label="Puppy">
            <FilterOption label="All puppies" isSelected={!selectedPuppyId} onPress={() => onChangePuppy('')} />
            {puppies.map((puppy) => (
              <FilterOption
                key={puppy.id}
                label={puppy.name}
                isSelected={selectedPuppyId === puppy.id}
                onPress={() => onChangePuppy(puppy.id)}
              />
            ))}
          </FilterSection>
        ) : null}

        {clients.length > 0 ? (
          <FilterSection label="Client">
            <FilterOption label="All clients" isSelected={!selectedClientId} onPress={() => onChangeClient('')} />
            {clients.map((client) => (
              <FilterOption
                key={client.id}
                label={getClientFullName(client)}
                isSelected={selectedClientId === client.id}
                onPress={() => onChangeClient(client.id)}
              />
            ))}
          </FilterSection>
        ) : null}
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

interface ReservationCardProps {
  clientsById: Map<string, Client>;
  isDeleting: boolean;
  isOwner: boolean;
  littersById: Map<string, Litter>;
  puppiesById: Map<string, Puppy>;
  reservation: Reservation;
  onDelete: () => void;
  onEdit: () => void;
}

function ReservationCard({
  clientsById,
  isDeleting,
  isOwner,
  littersById,
  puppiesById,
  reservation,
  onDelete,
  onEdit,
}: ReservationCardProps) {
  const puppy = puppiesById.get(reservation.puppy_id);
  const client = clientsById.get(reservation.client_id);
  const litter = reservation.litter_id ? littersById.get(reservation.litter_id) : null;
  const deposit = reservation.deposit_amount !== null
    ? `Deposit ${formatAmount(reservation.deposit_amount)} ${reservation.deposit_paid ? 'paid' : 'not paid'}`
    : reservation.deposit_paid
      ? 'Deposit paid'
      : null;
  const details = [
    getReservationStatusLabel(reservation.status),
    `Date ${reservation.reservation_date}`,
    getClientLabel(client),
    litter ? `Litter ${litter.name}` : null,
    reservation.reserved_price !== null ? `Reserved price ${formatAmount(reservation.reserved_price)}` : null,
    deposit,
  ].filter(Boolean);

  return (
    <AppCard>
      <View className="gap-3">
        <View className="gap-1">
          <Text className="text-xl font-semibold text-slate-950">{puppy?.name ?? 'Unknown puppy'}</Text>
          <Text className="text-sm leading-5 text-slate-600">{details.join(' | ')}</Text>
        </View>

        {reservation.notes ? <Text className="text-sm leading-5 text-slate-600">{reservation.notes}</Text> : null}

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
    </AppCard>
  );
}

function getClientLabel(client: Client | undefined) {
  return client ? getClientFullName(client) : 'Unknown client';
}

function formatAmount(value: number) {
  return value.toFixed(2);
}

function getErrorMessage(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && typeof (error as { message?: unknown }).message === 'string'
        ? (error as { message: string }).message
        : null;

  if (message) {
    if (message.includes('reservations_active_puppy_idx')) {
      return 'This puppy already has an active reservation.';
    }

    return message;
  }

  return 'Something went wrong while managing reservations.';
}
