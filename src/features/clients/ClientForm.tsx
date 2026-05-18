import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Text, View } from 'react-native';

import { Button, AppCard, Input } from '../../components';
import {
  clientFormSchema,
  getClientFormDefaultValues,
  toClientMutationInput,
  type Client,
  type ClientFormValues,
  type ClientMutationInput,
} from './types';

interface ClientFormProps {
  client?: Client | null;
  errorMessage?: string | null;
  isSubmitting?: boolean;
  onCancel: () => void;
  onSubmit: (input: ClientMutationInput) => Promise<void>;
}

const clientFormFields = ['firstName', 'lastName', 'email', 'phone', 'address', 'city', 'country', 'notes'] as const;
type ClientFormField = (typeof clientFormFields)[number];

export function ClientForm({ client, errorMessage, isSubmitting = false, onCancel, onSubmit }: ClientFormProps) {
  const {
    control,
    formState: { errors },
    handleSubmit,
    reset,
    setError,
  } = useForm<ClientFormValues>({
    defaultValues: getClientFormDefaultValues(client),
  });

  useEffect(() => {
    reset(getClientFormDefaultValues(client));
  }, [client, reset]);

  const handleValidSubmit = async (values: ClientFormValues) => {
    const result = clientFormSchema.safeParse(values);

    if (!result.success) {
      result.error.issues.forEach((issue) => {
        const field = issue.path[0];

        if (isClientFormField(field)) {
          setError(field, { message: issue.message });
        }
      });
      return;
    }

    await onSubmit(toClientMutationInput(result.data));
  };

  return (
    <AppCard title={client ? 'Edit client' : 'Create client'}>
      <View className="gap-4">
        <Controller
          control={control}
          name="firstName"
          render={({ field: { onBlur, onChange, value } }) => (
            <Input
              label="First name"
              placeholder="Ada"
              autoCapitalize="words"
              value={value}
              onBlur={onBlur}
              onChangeText={onChange}
              error={errors.firstName?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="lastName"
          render={({ field: { onBlur, onChange, value } }) => (
            <Input
              label="Last name"
              placeholder="Lovelace"
              autoCapitalize="words"
              value={value}
              onBlur={onBlur}
              onChangeText={onChange}
              error={errors.lastName?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="email"
          render={({ field: { onBlur, onChange, value } }) => (
            <Input
              label="Email"
              placeholder="ada@example.com"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              value={value}
              onBlur={onBlur}
              onChangeText={onChange}
              error={errors.email?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="phone"
          render={({ field: { onBlur, onChange, value } }) => (
            <Input
              label="Phone"
              placeholder="+34 600 000 000"
              keyboardType="phone-pad"
              value={value}
              onBlur={onBlur}
              onChangeText={onChange}
              error={errors.phone?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="address"
          render={({ field: { onBlur, onChange, value } }) => (
            <Input
              label="Address"
              placeholder="123 Main Street"
              autoCapitalize="words"
              value={value}
              onBlur={onBlur}
              onChangeText={onChange}
              error={errors.address?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="city"
          render={({ field: { onBlur, onChange, value } }) => (
            <Input
              label="City"
              placeholder="Madrid"
              autoCapitalize="words"
              value={value}
              onBlur={onBlur}
              onChangeText={onChange}
              error={errors.city?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="country"
          render={({ field: { onBlur, onChange, value } }) => (
            <Input
              label="Country"
              placeholder="Spain"
              autoCapitalize="words"
              value={value}
              onBlur={onBlur}
              onChangeText={onChange}
              error={errors.country?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="notes"
          render={({ field: { onBlur, onChange, value } }) => (
            <Input
              label="Notes"
              placeholder="Preferences, family details and placement notes"
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
            title={client ? 'Save client' : 'Create client'}
            loading={isSubmitting}
            className="flex-1"
            onPress={() => void handleSubmit(handleValidSubmit)()}
          />
        </View>
      </View>
    </AppCard>
  );
}

function isClientFormField(value: unknown): value is ClientFormField {
  return typeof value === 'string' && clientFormFields.includes(value as ClientFormField);
}
