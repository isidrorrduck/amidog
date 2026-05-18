import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, Text, View } from 'react-native';

import { AppCard, Button, Input } from '../../components';
import { getClientFullName, type Client } from '../clients';
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
  clients: Client[];
  defaultLitterId?: string;
  litters: Litter[];
  puppy?: Puppy | null;
  errorMessage?: string | null;
  isSubmitting?: boolean;
  onCancel: () => void;
  onSubmit: (input: PuppyMutationInput) => Promise<void>;
}

const puppyFormFields = ['litterId', 'clientId', 'name', 'sex', 'birthDate', 'color', 'status', 'notes'] as const;
type PuppyFormField = (typeof puppyFormFields)[number];

export function PuppyForm({
  clients,
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
    <AppCard title={puppy ? 'Editar cachorro' : 'Añadir cachorro'} subtitle="Ficha del cachorro">
      <View className="gap-5">
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
              label="Nombre"
              placeholder="Collar azul"
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
              <Text className="text-sm font-semibold text-slate-700">Sexo</Text>
              <View className="flex-row flex-wrap gap-2">
                {puppySexOptions.map((option) => {
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
              <Text className="text-sm font-semibold text-slate-700">Estado</Text>
              <View className="flex-row flex-wrap gap-2">
                {puppyStatusOptions.map((option) => {
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
          name="clientId"
          render={({ field: { onChange, value } }) => (
            <ClientSelector
              clients={clients}
              value={value}
              error={errors.clientId?.message}
              onChange={onChange}
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
          name="notes"
          render={({ field: { onBlur, onChange, value } }) => (
            <Input
              label="Notas"
              placeholder="Revisiones de salud, carácter y observaciones de entrega"
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
          <Text className="text-sm leading-5 text-muted">Crea una camada antes de añadir cachorros.</Text>
        ) : null}

        {errorMessage ? (
          <View className="rounded-lg bg-red-50 px-3 py-2">
            <Text className="text-sm leading-5 text-red-600">{errorMessage}</Text>
          </View>
        ) : null}

        <View className="flex-row gap-3 pt-1">
          <Button title="Cancelar" variant="secondary" className="flex-1" onPress={onCancel} />
          <Button
            title={puppy ? 'Guardar cachorro' : 'Añadir cachorro'}
            loading={isSubmitting}
            disabled={litters.length === 0}
            className="flex-1"
            onPress={() => void handleSubmit(handleValidSubmit)()}
          />
        </View>
      </View>
    </AppCard>
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
      <Text className="text-sm font-semibold text-slate-700">Camada</Text>
      <View className="flex-row flex-wrap gap-2">
        {litters.map((litter) => (
          <SelectOption
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

interface ClientSelectorProps {
  clients: Client[];
  error?: string;
  value: string;
  onChange: (value: string) => void;
}

function ClientSelector({ clients, error, value, onChange }: ClientSelectorProps) {
  return (
    <View className="gap-2">
      <Text className="text-sm font-semibold text-slate-700">Cliente asignado</Text>
      <View className="flex-row flex-wrap gap-2">
        <SelectOption label="Sin cliente" isSelected={!value} onPress={() => onChange('')} />
        {clients.map((client) => (
          <SelectOption
            key={client.id}
            label={getClientFullName(client)}
            isSelected={value === client.id}
            onPress={() => onChange(client.id)}
          />
        ))}
      </View>
      {clients.length === 0 ? (
        <Text className="text-sm leading-5 text-muted">Puedes asignar un cliente más adelante.</Text>
      ) : null}
      {error ? <Text className="text-sm text-red-600">{error}</Text> : null}
    </View>
  );
}

interface SelectOptionProps {
  isSelected: boolean;
  label: string;
  onPress: () => void;
}

function SelectOption({ isSelected, label, onPress }: SelectOptionProps) {
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
