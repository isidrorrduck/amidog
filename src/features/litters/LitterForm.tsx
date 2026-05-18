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
    <AppCard title={litter ? 'Edit litter' : 'Create litter'}>
      <View className="gap-4">
        <Controller
          control={control}
          name="name"
          render={({ field: { onBlur, onChange, value } }) => (
            <Input
              label="Name"
              placeholder="Spring 2026"
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
              <Text className="text-sm font-semibold text-slate-700">Status</Text>
              <View className="flex-row flex-wrap gap-2">
                {litterStatusOptions.map((option) => {
                  const isSelected = value === option;

                  return (
                    <Pressable
                      accessibilityRole="button"
                      key={option}
                      onPress={() => onChange(option)}
                      className={`min-h-11 min-w-24 items-center justify-center rounded-lg border px-3 ${
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
              label="Mother"
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
              label="Father"
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
              label="Expected birth date"
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
              label="Birth date"
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
              label="Notes"
              placeholder="Pairing, pregnancy checks and litter notes"
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

        {errorMessage ? <Text className="text-sm leading-5 text-red-600">{errorMessage}</Text> : null}

        <View className="flex-row gap-3">
          <Button title="Cancel" variant="secondary" className="flex-1" onPress={onCancel} />
          <Button
            title={litter ? 'Save litter' : 'Create litter'}
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
        <DogOption label="None" isSelected={!value} onPress={() => onChange('')} />
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
        <Text className="text-sm leading-5 text-slate-600">Add dogs first to link parents.</Text>
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
