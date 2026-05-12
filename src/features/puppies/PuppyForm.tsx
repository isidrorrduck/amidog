import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, Text, View } from 'react-native';

import { Button, Card, Input } from '../../components';
import { type Litter } from '../litters';
import {
  getPuppyFormDefaultValues,
  getPuppySexLabel,
  getPuppyStatusLabel,
  puppyFormSchema,
  puppySexOptions,
  puppyStatusOptions,
  toPuppyMutationInput,
  type Puppy,
  type PuppyFormValues,
  type PuppyMutationInput,
} from './types';

interface PuppyFormProps {
  defaultLitterId?: string;
  litters: Litter[];
  puppy?: Puppy | null;
  errorMessage?: string | null;
  isSubmitting?: boolean;
  onCancel: () => void;
  onSubmit: (input: PuppyMutationInput) => Promise<void>;
}

const puppyFormFields = ['litterId', 'name', 'sex', 'color', 'birthWeight', 'status', 'notes'] as const;
type PuppyFormField = (typeof puppyFormFields)[number];

export function PuppyForm({
  defaultLitterId = '',
  litters,
  puppy,
  errorMessage,
  isSubmitting = false,
  onCancel,
  onSubmit,
}: PuppyFormProps) {
  const {
    control,
    formState: { errors },
    handleSubmit,
    reset,
    setError,
  } = useForm<PuppyFormValues>({
    defaultValues: getPuppyFormDefaultValues(puppy, defaultLitterId),
  });

  useEffect(() => {
    reset(getPuppyFormDefaultValues(puppy, defaultLitterId));
  }, [defaultLitterId, puppy, reset]);

  const handleValidSubmit = async (values: PuppyFormValues) => {
    const result = puppyFormSchema.safeParse(values);

    if (!result.success) {
      result.error.issues.forEach((issue) => {
        const field = issue.path[0];

        if (isPuppyFormField(field)) {
          setError(field, { message: issue.message });
        }
      });
      return;
    }

    await onSubmit(toPuppyMutationInput(result.data));
  };

  return (
    <Card title={puppy ? 'Edit puppy' : 'Create puppy'}>
      <View className="gap-4">
        <Controller
          control={control}
          name="litterId"
          render={({ field: { onChange, value } }) => (
            <LitterSelector
              litters={litters}
              value={value}
              error={errors.litterId?.message}
              onChange={onChange}
            />
          )}
        />

        <Controller
          control={control}
          name="name"
          render={({ field: { onBlur, onChange, value } }) => (
            <Input
              label="Name"
              placeholder="Blue collar"
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
          name="sex"
          render={({ field: { onChange, value } }) => (
            <View className="gap-2">
              <Text className="text-sm font-semibold text-slate-700">Sex</Text>
              <View className="flex-row gap-2">
                {puppySexOptions.map((option) => {
                  const isSelected = value === option;

                  return (
                    <Pressable
                      accessibilityRole="button"
                      key={option}
                      onPress={() => onChange(option)}
                      className={`min-h-11 flex-1 items-center justify-center rounded-lg border px-3 ${
                        isSelected ? 'border-brand-600 bg-brand-50' : 'border-slate-300 bg-white'
                      }`}
                    >
                      <Text className={`text-sm font-semibold ${isSelected ? 'text-brand-700' : 'text-slate-700'}`}>
                        {getPuppySexLabel(option)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {errors.sex?.message ? <Text className="text-sm text-red-600">{errors.sex.message}</Text> : null}
            </View>
          )}
        />

        <Controller
          control={control}
          name="status"
          render={({ field: { onChange, value } }) => (
            <View className="gap-2">
              <Text className="text-sm font-semibold text-slate-700">Status</Text>
              <View className="flex-row flex-wrap gap-2">
                {puppyStatusOptions.map((option) => {
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
                        {getPuppyStatusLabel(option)}
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
          name="color"
          render={({ field: { onBlur, onChange, value } }) => (
            <Input
              label="Color"
              placeholder="Black tricolor"
              autoCapitalize="words"
              value={value}
              onBlur={onBlur}
              onChangeText={onChange}
              error={errors.color?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="birthWeight"
          render={({ field: { onBlur, onChange, value } }) => (
            <Input
              label="Birth weight"
              placeholder="0.45"
              keyboardType="decimal-pad"
              value={value}
              onBlur={onBlur}
              onChangeText={onChange}
              error={errors.birthWeight?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="notes"
          render={({ field: { onBlur, onChange, value } }) => (
            <Input
              label="Notes"
              placeholder="Health checks, placement notes and observations"
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

        {litters.length === 0 ? (
          <Text className="text-sm leading-5 text-slate-600">Create a litter before adding puppies.</Text>
        ) : null}

        {errorMessage ? <Text className="text-sm leading-5 text-red-600">{errorMessage}</Text> : null}

        <View className="flex-row gap-3">
          <Button title="Cancel" variant="secondary" className="flex-1" onPress={onCancel} />
          <Button
            title={puppy ? 'Save puppy' : 'Create puppy'}
            loading={isSubmitting}
            disabled={litters.length === 0}
            className="flex-1"
            onPress={() => void handleSubmit(handleValidSubmit)()}
          />
        </View>
      </View>
    </Card>
  );
}

interface LitterSelectorProps {
  litters: Litter[];
  error?: string;
  value: string;
  onChange: (value: string) => void;
}

function LitterSelector({ litters, error, value, onChange }: LitterSelectorProps) {
  return (
    <View className="gap-2">
      <Text className="text-sm font-semibold text-slate-700">Litter</Text>
      <View className="flex-row flex-wrap gap-2">
        {litters.map((litter) => (
          <LitterOption
            key={litter.id}
            label={litter.name}
            isSelected={value === litter.id}
            onPress={() => onChange(litter.id)}
          />
        ))}
      </View>
      {error ? <Text className="text-sm text-red-600">{error}</Text> : null}
    </View>
  );
}

interface LitterOptionProps {
  isSelected: boolean;
  label: string;
  onPress: () => void;
}

function LitterOption({ isSelected, label, onPress }: LitterOptionProps) {
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

function isPuppyFormField(value: unknown): value is PuppyFormField {
  return typeof value === 'string' && puppyFormFields.includes(value as PuppyFormField);
}
