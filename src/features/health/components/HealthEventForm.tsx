import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, Text, View } from 'react-native';

import { AppCard, Button, Input } from '../../../components';
import {
  getHealthEventFormDefaultValues,
  healthEventFormSchema,
  toHealthEventMutationInput,
  type HealthEventFormValues,
} from '../schemas';
import {
  getHealthEventTypeLabel,
  healthEventTypeOptions,
  type HealthEvent,
  type HealthEventMutationInput,
  type HealthEventType,
  type HealthTimelineSubject,
} from '../types';

interface HealthEventFormProps {
  errorMessage?: string | null;
  event?: HealthEvent | null;
  isSubmitting?: boolean;
  subject: HealthTimelineSubject;
  onCancel: () => void;
  onSubmit: (input: HealthEventMutationInput) => Promise<void>;
}

const healthEventFormFields = ['eventType', 'eventDate', 'title', 'notes'] as const;
type HealthEventFormField = (typeof healthEventFormFields)[number];

export function HealthEventForm({
  errorMessage,
  event,
  isSubmitting = false,
  subject,
  onCancel,
  onSubmit,
}: HealthEventFormProps) {
  const {
    control,
    formState: { errors },
    handleSubmit,
    reset,
    setError,
  } = useForm<HealthEventFormValues>({
    defaultValues: getHealthEventFormDefaultValues(event),
  });

  useEffect(() => {
    reset(getHealthEventFormDefaultValues(event));
  }, [event, reset]);

  const handleValidSubmit = async (values: HealthEventFormValues) => {
    const result = healthEventFormSchema.safeParse(values);

    if (!result.success) {
      result.error.issues.forEach((issue) => {
        const field = issue.path[0];

        if (isHealthEventFormField(field)) {
          setError(field, { message: issue.message });
        }
      });
      return;
    }

    await onSubmit(toHealthEventMutationInput(result.data, subject));
  };

  return (
    <AppCard
      title={event ? 'Editar evento' : 'Añadir evento'}
      subtitle={`Timeline de salud de ${subject.label}`}
    >
      <View className="gap-4">
        <Controller
          control={control}
          name="eventType"
          render={({ field: { onChange, value } }) => (
            <EventTypeSelector value={value} error={errors.eventType?.message} onChange={onChange} />
          )}
        />

        <Controller
          control={control}
          name="eventDate"
          render={({ field: { onBlur, onChange, value } }) => (
            <Input
              label="Fecha"
              placeholder="2026-06-02"
              keyboardType="numbers-and-punctuation"
              value={value}
              onBlur={onBlur}
              onChangeText={onChange}
              error={errors.eventDate?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="title"
          render={({ field: { onBlur, onChange, value } }) => (
            <Input
              label="Titulo"
              placeholder="Vacuna anual"
              autoCapitalize="sentences"
              value={value}
              onBlur={onBlur}
              onChangeText={onChange}
              error={errors.title?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="notes"
          render={({ field: { onBlur, onChange, value } }) => (
            <Input
              label="Notas"
              placeholder="Detalle del tratamiento, dosis, peso o proxima revision"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={value}
              onBlur={onBlur}
              onChangeText={onChange}
              error={errors.notes?.message}
              className="min-h-28 py-3"
            />
          )}
        />

        {errorMessage ? (
          <View className="rounded-lg bg-red-50 px-3 py-2">
            <Text className="text-sm leading-5 text-red-600">{errorMessage}</Text>
          </View>
        ) : null}

        <View className="flex-row gap-3">
          <Button title="Cancelar" variant="secondary" className="flex-1" onPress={onCancel} />
          <Button
            title={event ? 'Guardar evento' : 'Añadir evento'}
            loading={isSubmitting}
            className="flex-1"
            onPress={() => void handleSubmit(handleValidSubmit)()}
          />
        </View>
      </View>
    </AppCard>
  );
}

interface EventTypeSelectorProps {
  error?: string;
  value: HealthEventType;
  onChange: (value: HealthEventType) => void;
}

function EventTypeSelector({ error, value, onChange }: EventTypeSelectorProps) {
  return (
    <View className="gap-2">
      <Text className="text-sm font-semibold text-slate-700">Tipo de evento</Text>
      <View className="flex-row flex-wrap gap-2">
        {healthEventTypeOptions.map((option) => (
          <SelectorOption
            key={option}
            label={getHealthEventTypeLabel(option)}
            isSelected={value === option}
            onPress={() => onChange(option)}
          />
        ))}
      </View>
      {error ? <Text className="text-sm text-red-600">{error}</Text> : null}
    </View>
  );
}

interface SelectorOptionProps {
  isSelected: boolean;
  label: string;
  onPress: () => void;
}

function SelectorOption({ isSelected, label, onPress }: SelectorOptionProps) {
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

function isHealthEventFormField(value: unknown): value is HealthEventFormField {
  return typeof value === 'string' && healthEventFormFields.includes(value as HealthEventFormField);
}
