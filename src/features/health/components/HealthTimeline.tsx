import { useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { AppCard, Button, EmptyState, LoadingState } from '../../../components';
import {
  useCreateHealthEvent,
  useDeleteHealthEvent,
  useHealthEvents,
  useUpdateHealthEvent,
} from '../hooks';
import {
  getHealthEventTypeLabel,
  getHealthEventTypeTone,
  type HealthEvent,
  type HealthEventMutationInput,
  type HealthEventTone,
  type HealthTimelineSubject,
} from '../types';
import { HealthEventForm } from './HealthEventForm';

interface HealthTimelineProps {
  isOwner: boolean;
  kennelId: string | null | undefined;
  kennelName?: string | null;
  subject: HealthTimelineSubject;
}

export function HealthTimeline({ isOwner, kennelId, kennelName, subject }: HealthTimelineProps) {
  const filters = subject.type === 'dog' ? { dogId: subject.id } : { puppyId: subject.id };
  const healthEventsQuery = useHealthEvents(kennelId, filters);
  const createHealthEventMutation = useCreateHealthEvent(kennelId);
  const updateHealthEventMutation = useUpdateHealthEvent(kennelId);
  const deleteHealthEventMutation = useDeleteHealthEvent(kennelId);
  const [editingEvent, setEditingEvent] = useState<HealthEvent | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [screenError, setScreenError] = useState<string | null>(null);
  const events = healthEventsQuery.data ?? [];
  const isFormSubmitting = createHealthEventMutation.isPending || updateHealthEventMutation.isPending;

  const openCreateForm = () => {
    setEditingEvent(null);
    setFormError(null);
    setScreenError(null);
    createHealthEventMutation.reset();
    updateHealthEventMutation.reset();
    setIsFormOpen(true);
  };

  const openEditForm = (event: HealthEvent) => {
    setEditingEvent(event);
    setFormError(null);
    setScreenError(null);
    createHealthEventMutation.reset();
    updateHealthEventMutation.reset();
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setEditingEvent(null);
    setFormError(null);
    setIsFormOpen(false);
  };

  const handleSubmitHealthEvent = async (input: HealthEventMutationInput) => {
    setFormError(null);

    try {
      if (editingEvent) {
        await updateHealthEventMutation.mutateAsync({ healthEventId: editingEvent.id, input });
      } else {
        await createHealthEventMutation.mutateAsync(input);
      }

      closeForm();
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  };

  const handleDeleteHealthEvent = (event: HealthEvent) => {
    Alert.alert('¿Eliminar evento?', `Se eliminará ${event.title} de ${kennelName ?? 'este criadero'}.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          setScreenError(null);
          void deleteHealthEventMutation.mutateAsync(event.id).catch((error) => {
            setScreenError(getErrorMessage(error));
          });
        },
      },
    ]);
  };

  return (
    <View className="gap-3">
      <View className="gap-3">
        <View className="flex-row items-start justify-between gap-4">
          <View className="min-w-0 flex-1 gap-1">
            <Text className="text-xl font-semibold text-ink">Linea de salud</Text>
            <Text className="text-sm leading-5 text-muted">Eventos clinicos y cuidados de {subject.label}</Text>
          </View>
          <Button
            title={isFormOpen ? 'Cerrar' : '+ Añadir evento'}
            variant={isFormOpen ? 'secondary' : 'primary'}
            onPress={isFormOpen ? closeForm : openCreateForm}
          />
        </View>
      </View>

      {screenError ? (
        <AppCard className="border-red-200 bg-red-50">
          <Text className="text-sm leading-5 text-red-600">{screenError}</Text>
        </AppCard>
      ) : null}

      {isFormOpen ? (
        <HealthEventForm
          event={editingEvent}
          subject={subject}
          errorMessage={formError}
          isSubmitting={isFormSubmitting}
          onCancel={closeForm}
          onSubmit={handleSubmitHealthEvent}
        />
      ) : null}

      {healthEventsQuery.isLoading ? (
        <LoadingState title="Cargando salud" message="Preparando la linea temporal de salud." />
      ) : null}

      {healthEventsQuery.error ? (
        <AppCard title="No se han podido cargar los eventos" className="border-red-200 bg-red-50">
          <Text className="text-sm leading-5 text-red-600">{getErrorMessage(healthEventsQuery.error)}</Text>
        </AppCard>
      ) : null}

      {!healthEventsQuery.isLoading && !healthEventsQuery.error && events.length === 0 ? (
        <EmptyState
          title="Todavia no hay eventos de salud"
          message={`Añade vacunas, visitas veterinarias, pesos y notas clinicas de ${subject.label}.`}
          actionLabel={!isFormOpen ? '+ Añadir evento' : undefined}
          onAction={!isFormOpen ? openCreateForm : undefined}
        />
      ) : null}

      {events.length > 0 ? (
        <View className="gap-3">
          <Text className="text-sm font-semibold text-muted">
            {events.length === 1 ? '1 evento registrado' : `${events.length} eventos registrados`}
          </Text>
          {events.map((event) => (
            <HealthEventCard
              event={event}
              isDeleting={deleteHealthEventMutation.isPending}
              isOwner={isOwner}
              key={event.id}
              onDelete={() => handleDeleteHealthEvent(event)}
              onEdit={() => openEditForm(event)}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

interface HealthEventCardProps {
  event: HealthEvent;
  isDeleting: boolean;
  isOwner: boolean;
  onDelete: () => void;
  onEdit: () => void;
}

function HealthEventCard({ event, isDeleting, isOwner, onDelete, onEdit }: HealthEventCardProps) {
  return (
    <AppCard>
      <View className="gap-3">
        <View className="flex-row items-start gap-3">
          <EventTypeBadge event={event} />

          <View className="min-w-0 flex-1 gap-1">
            <Text className="text-lg font-semibold text-ink" numberOfLines={2}>
              {event.title}
            </Text>
            <Text className="text-sm leading-5 text-muted">
              {formatIsoDate(event.event_date)} | {getHealthEventTypeLabel(event.event_type)}
            </Text>
          </View>
        </View>

        {event.notes ? (
          <Text className="text-sm leading-5 text-muted" numberOfLines={4}>
            {event.notes}
          </Text>
        ) : null}

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
    </AppCard>
  );
}

function EventTypeBadge({ event }: { event: HealthEvent }) {
  const tone = getHealthEventTypeTone(event.event_type);
  const containerClass = getToneContainerClass(tone);
  const textClass = getToneTextClass(tone);

  return (
    <View className={`min-h-11 min-w-20 items-center justify-center rounded-lg border px-3 ${containerClass}`}>
      <Text className={`text-center text-xs font-semibold ${textClass}`} numberOfLines={2}>
        {getHealthEventTypeLabel(event.event_type)}
      </Text>
    </View>
  );
}

function getToneContainerClass(tone: HealthEventTone) {
  const classes: Record<HealthEventTone, string> = {
    brand: 'border-brand-100 bg-brand-50',
    accent: 'border-accent-500 bg-accent-50',
    success: 'border-emerald-200 bg-emerald-50',
    warning: 'border-amber-200 bg-amber-50',
    danger: 'border-red-200 bg-red-50',
    neutral: 'border-border bg-slate-50',
  };

  return classes[tone];
}

function getToneTextClass(tone: HealthEventTone) {
  const classes: Record<HealthEventTone, string> = {
    brand: 'text-brand-700',
    accent: 'text-accent-600',
    success: 'text-emerald-700',
    warning: 'text-amber-700',
    danger: 'text-red-600',
    neutral: 'text-muted',
  };

  return classes[tone];
}

function formatIsoDate(value: string) {
  const [year, month, day] = value.split('-');

  return year && month && day ? `${day}/${month}/${year}` : value;
}

function getErrorMessage(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && typeof (error as { message?: unknown }).message === 'string'
        ? (error as { message: string }).message
        : null;

  if (message) {
    if (message.includes('Health event must be linked to a dog or puppy')) {
      return 'El evento debe estar vinculado a un perro o cachorro.';
    }

    if (message.includes('Dog must belong to the health event kennel')) {
      return 'El perro debe pertenecer al criadero del evento.';
    }

    if (message.includes('Puppy must belong to the health event kennel')) {
      return 'El cachorro debe pertenecer al criadero del evento.';
    }

    return message;
  }

  return 'Algo ha ido mal al gestionar los eventos de salud.';
}
