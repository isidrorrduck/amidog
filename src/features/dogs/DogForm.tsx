import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, Text, View } from 'react-native';

import { Button, AppCard, Input } from '../../components';
import {
  dogFormSchema,
  dogSexOptions,
  getDogFormDefaultValues,
  getDogSexLabel,
  toDogMutationInput,
  type Dog,
  type DogFormValues,
  type DogMutationInput,
} from './types';

interface DogFormProps {
  dog?: Dog | null;
  errorMessage?: string | null;
  isSubmitting?: boolean;
  onCancel: () => void;
  onSubmit: (input: DogMutationInput) => Promise<void>;
}

const dogFormFields = ['name', 'breed', 'sex', 'birthDate', 'color', 'microchipNumber', 'notes'] as const;
type DogFormField = (typeof dogFormFields)[number];

export function DogForm({ dog, errorMessage, isSubmitting = false, onCancel, onSubmit }: DogFormProps) {
  const {
    control,
    formState: { errors },
    handleSubmit,
    reset,
    setError,
  } = useForm<DogFormValues>({
    defaultValues: getDogFormDefaultValues(dog),
  });

  useEffect(() => {
    reset(getDogFormDefaultValues(dog));
  }, [dog, reset]);

  const handleValidSubmit = async (values: DogFormValues) => {
    const result = dogFormSchema.safeParse(values);

    if (!result.success) {
      result.error.issues.forEach((issue) => {
        const field = issue.path[0];

        if (isDogFormField(field)) {
          setError(field, { message: issue.message });
        }
      });
      return;
    }

    await onSubmit(toDogMutationInput(result.data));
  };

  return (
    <AppCard title={dog ? 'Editar perro' : 'Añadir perro'} subtitle="Ficha del perro">
      <View className="gap-5">
        <Controller
          control={control}
          name="name"
          render={({ field: { onBlur, onChange, value } }) => (
            <Input
              label="Nombre"
              placeholder="Mora"
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
          name="breed"
          render={({ field: { onBlur, onChange, value } }) => (
            <Input
              label="Raza"
              placeholder="Border Collie"
              autoCapitalize="words"
              value={value}
              onBlur={onBlur}
              onChangeText={onChange}
              error={errors.breed?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="sex"
          render={({ field: { onChange, value } }) => (
            <View className="gap-2">
              <Text className="text-sm font-semibold text-slate-700">Sexo</Text>
              <View className="flex-row flex-wrap gap-2">
                {dogSexOptions.map((option) => {
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
                        {getDogSexLabel(option)}
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
          name="birthDate"
          render={({ field: { onBlur, onChange, value } }) => (
            <Input
              label="Fecha de nacimiento"
              placeholder="2024-05-10"
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
          name="color"
          render={({ field: { onBlur, onChange, value } }) => (
            <Input
              label="Color"
              placeholder="Tricolor negro"
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
          name="microchipNumber"
          render={({ field: { onBlur, onChange, value } }) => (
            <Input
              label="Microchip"
              placeholder="981000000000000"
              autoCapitalize="characters"
              value={value}
              onBlur={onBlur}
              onChangeText={onChange}
              error={errors.microchipNumber?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="notes"
          render={({ field: { onBlur, onChange, value } }) => (
            <Input
              label="Notas"
              placeholder="Temperamento, salud y datos de registro"
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
            title={dog ? 'Guardar perro' : 'Añadir perro'}
            loading={isSubmitting}
            className="flex-1"
            onPress={() => void handleSubmit(handleValidSubmit)()}
          />
        </View>
      </View>
    </AppCard>
  );
}

function isDogFormField(value: unknown): value is DogFormField {
  return typeof value === 'string' && dogFormFields.includes(value as DogFormField);
}
