import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, Text, View } from 'react-native';

import { Button, AppCard, Input } from '../../components';
import { getDogSexLabel, type Dog } from '../dogs';
import {
  getLitterFormDefaultValues,
  getLitterStatusLabel,
  litterFormSchema,
  litterStatusOptions,
  toLitterMutationInput,
  type Litter,
  type LitterFormValues,
  type LitterMutationInput,
} from './types';

interface LitterFormProps {
  dogs: Dog[];
  litter?: Litter | null;
  errorMessage?: string | null;
  isSubmitting?: boolean;
  onCancel: () => void;
  onSubmit: (input: LitterMutationInput) => Promise<void>;
}

const litterFormFields = ['name', 'motherId', 'fatherId', 'birthDate', 'expectedBirthDate', 'status', 'notes'] as const;
type LitterFormField = (typeof litterFormFields)[number];

export function LitterForm({
  dogs,
  litter,
  errorMessage,
  isSubmitting = false,
  onCancel,
  onSubmit,
}: LitterFormProps) {
  const {
    control,
    formState: { errors },
    handleSubmit,
    reset,
    setError,
  } = useForm<LitterFormValues>({
    defaultValues: getLitterFormDefaultValues(litter),
  });

  useEffect(() => {
    reset(getLitterFormDefaultValues(litter));
  }, [litter, reset]);

  const handleValidSubmit = async (values: LitterFormValues) => {
    const result = litterFormSchema.safeParse(values);

    if (!result.success) {
      result.error.issues.forEach((issue) => {
        const field = issue.path[0];

        if (isLitterFormField(field)) {
          setError(field, { message: issue.message });
        }
      });
      return;
    }

    await onSubmit(toLitterMutationInput(result.data));
  };

  return (
    <AppCard title={litter ? 'Editar camada' : 'Añadir camada'} subtitle="Ficha de la camada">
      <View className="gap-5">
        <Controller
          control={control}
          name="name"
          render={({ field: { onBlur, onChange, value } }) => (
            <Input
              label="Nombre"
              placeholder="Primavera 2026"
              autoCapitalize="words"
              value={value}
              onBlur={onBlur}
              onChangeText={onChange}
              error={errors.name?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="status"
          render={({ field: { onChange, value } }) => (
            <View className="gap-2">
              <Text className="text-sm font-semibold text-slate-700">Estado</Text>
              <View className="flex-row flex-wrap gap-2">
                {litterStatusOptions.map((option) => {
                  const isSelected = value === option;

                  return (
                    <Pressable
                      accessibilityRole="button"
                      key={option}
                      onPress={() => onChange(option)}
                      className={`min-h-11 min-w-28 flex-1 items-center justify-center rounded-lg border px-3 ${
                        isSelected ? 'border-brand-600 bg-brand-50' : 'border-slate-300 bg-white'
                      }`}
                    >
                      <Text className={`text-sm font-semibold ${isSelected ? 'text-brand-700' : 'text-slate-700'}`}>
                        {getLitterStatusLabel(option)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {errors.status?.message ? <Text className="text-sm text-red-600">{errors.status.message}</Text> : null}
            </View>
          )}
        />

        <Controller
          control={control}
          name="motherId"
          render={({ field: { onChange, value } }) => (
            <DogSelector
              label="Madre"
              dogs={dogs}
              value={value}
              error={errors.motherId?.message}
              onChange={onChange}
            />
          )}
        />

        <Controller
          control={control}
          name="fatherId"
          render={({ field: { onChange, value } }) => (
            <DogSelector
              label="Padre"
              dogs={dogs}
              value={value}
              error={errors.fatherId?.message}
              onChange={onChange}
            />
          )}
        />

        <Controller
          control={control}
          name="expectedBirthDate"
          render={({ field: { onBlur, onChange, value } }) => (
            <Input
              label="Fecha prevista de nacimiento"
              placeholder="2026-06-20"
              keyboardType="numbers-and-punctuation"
              value={value}
              onBlur={onBlur}
              onChangeText={onChange}
              error={errors.expectedBirthDate?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="birthDate"
          render={({ field: { onBlur, onChange, value } }) => (
            <Input
              label="Fecha de nacimiento"
              placeholder="2026-06-22"
              keyboardType="numbers-and-punctuation"
              value={value}
              onBlur={onBlur}
              onChangeText={onChange}
              error={errors.birthDate?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="notes"
          render={({ field: { onBlur, onChange, value } }) => (
            <Input
              label="Notas"
              placeholder="Cruce, revisiones de gestación y notas de camada"
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

        <View className="flex-row gap-3 pt-1">
          <Button title="Cancelar" variant="secondary" className="flex-1" onPress={onCancel} />
          <Button
            title={litter ? 'Guardar camada' : 'Añadir camada'}
            loading={isSubmitting}
            className="flex-1"
            onPress={() => void handleSubmit(handleValidSubmit)()}
          />
        </View>
      </View>
    </AppCard>
  );
}

interface DogSelectorProps {
  dogs: Dog[];
  error?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function DogSelector({ dogs, error, label, value, onChange }: DogSelectorProps) {
  return (
    <View className="gap-2">
      <Text className="text-sm font-semibold text-slate-700">{label}</Text>
      <View className="flex-row flex-wrap gap-2">
        <DogOption label="Ninguno" isSelected={!value} onPress={() => onChange('')} />
        {dogs.map((dog) => (
          <DogOption
            key={dog.id}
            label={`${dog.name} (${getDogSexLabel(dog.sex)})`}
            isSelected={value === dog.id}
            onPress={() => onChange(dog.id)}
          />
        ))}
      </View>
      {dogs.length === 0 ? (
        <Text className="text-sm leading-5 text-muted">Añade perros primero para vincular progenitores.</Text>
      ) : null}
      {error ? <Text className="text-sm text-red-600">{error}</Text> : null}
    </View>
  );
}

interface DogOptionProps {
  isSelected: boolean;
  label: string;
  onPress: () => void;
}

function DogOption({ isSelected, label, onPress }: DogOptionProps) {
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

function isLitterFormField(value: unknown): value is LitterFormField {
  return typeof value === 'string' && litterFormFields.includes(value as LitterFormField);
}
