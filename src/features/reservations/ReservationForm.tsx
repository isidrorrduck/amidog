import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, Text, View } from 'react-native';

import { Button, AppCard, Input } from '../../components';
import { getClientFullName, type Client } from '../clients';
import { type Puppy } from '../puppies';
import {
  getReservationFormDefaultValues,
  getReservationStatusLabel,
  reservationFormSchema,
  reservationStatusOptions,
  toReservationMutationInput,
  type Reservation,
  type ReservationFormValues,
  type ReservationMutationInput,
} from './types';

interface ReservationFormProps {
  clients: Client[];
  defaultClientId?: string | null;
  defaultPuppyId?: string | null;
  errorMessage?: string | null;
  isSubmitting?: boolean;
  puppies: Puppy[];
  reservation?: Reservation | null;
  onCancel: () => void;
  onSubmit: (input: ReservationMutationInput) => Promise<void>;
}

const reservationFormFields = [
  'puppyId',
  'clientId',
  'status',
  'reservedPrice',
  'depositAmount',
  'depositPaid',
  'reservationDate',
  'notes',
] as const;
type ReservationFormField = (typeof reservationFormFields)[number];

export function ReservationForm({
  clients,
  defaultClientId,
  defaultPuppyId,
  errorMessage,
  isSubmitting = false,
  puppies,
  reservation,
  onCancel,
  onSubmit,
}: ReservationFormProps) {
  const defaults = { clientId: defaultClientId, puppyId: defaultPuppyId };
  const {
    control,
    formState: { errors },
    handleSubmit,
    reset,
    setError,
  } = useForm<ReservationFormValues>({
    defaultValues: getReservationFormDefaultValues(reservation, defaults),
  });

  useEffect(() => {
    reset(getReservationFormDefaultValues(reservation, defaults));
  }, [defaultClientId, defaultPuppyId, reservation, reset]);

  const handleValidSubmit = async (values: ReservationFormValues) => {
    const result = reservationFormSchema.safeParse(values);

    if (!result.success) {
      result.error.issues.forEach((issue) => {
        const field = issue.path[0];

        if (isReservationFormField(field)) {
          setError(field, { message: issue.message });
        }
      });
      return;
    }

    await onSubmit(toReservationMutationInput(result.data));
  };

  return (
    <AppCard title={reservation ? 'Editar reserva' : 'Crear reserva'}>
      <View className="gap-4">
        <Controller
          control={control}
          name="puppyId"
          render={({ field: { onChange, value } }) => (
            <PuppySelector puppies={puppies} value={value} error={errors.puppyId?.message} onChange={onChange} />
          )}
        />

        <Controller
          control={control}
          name="clientId"
          render={({ field: { onChange, value } }) => (
            <ClientSelector clients={clients} value={value} error={errors.clientId?.message} onChange={onChange} />
          )}
        />

        <Controller
          control={control}
          name="status"
          render={({ field: { onChange, value } }) => (
            <View className="gap-2">
              <Text className="text-sm font-semibold text-slate-700">Estado</Text>
              <View className="flex-row flex-wrap gap-2">
                {reservationStatusOptions.map((option) => (
                  <SelectorOption
                    key={option}
                    label={getReservationStatusLabel(option)}
                    isSelected={value === option}
                    onPress={() => onChange(option)}
                  />
                ))}
              </View>
              {errors.status?.message ? <Text className="text-sm text-red-600">{errors.status.message}</Text> : null}
            </View>
          )}
        />

        <Controller
          control={control}
          name="reservedPrice"
          render={({ field: { onBlur, onChange, value } }) => (
            <Input
              label="Precio reservado"
              placeholder="1200.00"
              keyboardType="decimal-pad"
              value={value}
              onBlur={onBlur}
              onChangeText={onChange}
              error={errors.reservedPrice?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="depositAmount"
          render={({ field: { onBlur, onChange, value } }) => (
            <Input
              label="Importe de la señal"
              placeholder="300.00"
              keyboardType="decimal-pad"
              value={value}
              onBlur={onBlur}
              onChangeText={onChange}
              error={errors.depositAmount?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="depositPaid"
          render={({ field: { onChange, value } }) => (
            <View className="gap-2">
              <Text className="text-sm font-semibold text-slate-700">Señal</Text>
              <View className="flex-row gap-2">
                <SelectorOption label="No pagada" isSelected={!value} onPress={() => onChange(false)} />
                <SelectorOption label="Pagada" isSelected={value} onPress={() => onChange(true)} />
              </View>
              {errors.depositPaid?.message ? (
                <Text className="text-sm text-red-600">{errors.depositPaid.message}</Text>
              ) : null}
            </View>
          )}
        />

        <Controller
          control={control}
          name="reservationDate"
          render={({ field: { onBlur, onChange, value } }) => (
            <Input
              label="Fecha de reserva"
              placeholder="2026-05-12"
              keyboardType="numbers-and-punctuation"
              value={value}
              onBlur={onBlur}
              onChangeText={onChange}
              error={errors.reservationDate?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="notes"
          render={({ field: { onBlur, onChange, value } }) => (
            <Input
              label="Notas"
              placeholder="Condiciones de entrega, seguimiento y notas de pago"
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

        {puppies.length === 0 ? (
          <Text className="text-sm leading-5 text-slate-600">Crea un cachorro antes de añadir reservas.</Text>
        ) : null}

        {clients.length === 0 ? (
          <Text className="text-sm leading-5 text-slate-600">Crea un cliente antes de añadir reservas.</Text>
        ) : null}

        {errorMessage ? <Text className="text-sm leading-5 text-red-600">{errorMessage}</Text> : null}

        <View className="flex-row gap-3">
          <Button title="Cancelar" variant="secondary" className="flex-1" onPress={onCancel} />
          <Button
            title={reservation ? 'Guardar reserva' : 'Crear reserva'}
            loading={isSubmitting}
            disabled={clients.length === 0 || puppies.length === 0}
            className="flex-1"
            onPress={() => void handleSubmit(handleValidSubmit)()}
          />
        </View>
      </View>
    </AppCard>
  );
}

interface PuppySelectorProps {
  error?: string;
  puppies: Puppy[];
  value: string;
  onChange: (value: string) => void;
}

function PuppySelector({ error, puppies, value, onChange }: PuppySelectorProps) {
  return (
    <View className="gap-2">
      <Text className="text-sm font-semibold text-slate-700">Cachorro</Text>
      <View className="flex-row flex-wrap gap-2">
        {puppies.map((puppy) => (
          <SelectorOption
            key={puppy.id}
            label={puppy.name}
            isSelected={value === puppy.id}
            onPress={() => onChange(puppy.id)}
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
      <Text className="text-sm font-semibold text-slate-700">Cliente</Text>
      <View className="flex-row flex-wrap gap-2">
        {clients.map((client) => (
          <SelectorOption
            key={client.id}
            label={getClientFullName(client)}
            isSelected={value === client.id}
            onPress={() => onChange(client.id)}
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

function isReservationFormField(value: unknown): value is ReservationFormField {
  return typeof value === 'string' && reservationFormFields.includes(value as ReservationFormField);
}
