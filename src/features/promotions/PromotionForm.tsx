import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, Text, View } from 'react-native';

import { Button, AppCard, Input } from '../../components';
import {
  getPromotionFormDefaultValues,
  getPromotionTypeLabel,
  promotionFormSchema,
  promotionTypeOptions,
  toPromotionMutationInput,
  type Promotion,
  type PromotionFormValues,
  type PromotionMutationInput,
} from './types';

interface PromotionFormProps {
  errorMessage?: string | null;
  isSubmitting?: boolean;
  promotion?: Promotion | null;
  onCancel: () => void;
  onSubmit: (input: PromotionMutationInput) => Promise<void>;
}

const promotionFormFields = ['title', 'message', 'imageUrl', 'actionUrl', 'promotionType'] as const;
type PromotionFormField = (typeof promotionFormFields)[number];

export function PromotionForm({
  errorMessage,
  isSubmitting = false,
  promotion,
  onCancel,
  onSubmit,
}: PromotionFormProps) {
  const {
    control,
    formState: { errors },
    handleSubmit,
    reset,
    setError,
  } = useForm<PromotionFormValues>({
    defaultValues: getPromotionFormDefaultValues(promotion),
  });

  useEffect(() => {
    reset(getPromotionFormDefaultValues(promotion));
  }, [promotion, reset]);

  const handleValidSubmit = async (values: PromotionFormValues) => {
    const result = promotionFormSchema.safeParse(values);

    if (!result.success) {
      result.error.issues.forEach((issue) => {
        const field = issue.path[0];

        if (isPromotionFormField(field)) {
          setError(field, { message: issue.message });
        }
      });
      return;
    }

    await onSubmit(toPromotionMutationInput(result.data));
  };

  return (
    <AppCard title={promotion ? 'Edit promotion' : 'Create promotion'}>
      <View className="gap-4">
        <Controller
          control={control}
          name="title"
          render={({ field: { onBlur, onChange, value } }) => (
            <Input
              label="Title"
              placeholder="Spring veterinary checkup"
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
          name="promotionType"
          render={({ field: { onChange, value } }) => (
            <SelectorSection label="Type" error={errors.promotionType?.message}>
              {promotionTypeOptions.map((option) => (
                <SelectorOption
                  key={option}
                  label={getPromotionTypeLabel(option)}
                  isSelected={value === option}
                  onPress={() => onChange(option)}
                />
              ))}
            </SelectorSection>
          )}
        />

        <Controller
          control={control}
          name="message"
          render={({ field: { onBlur, onChange, value } }) => (
            <Input
              label="Message"
              placeholder="Offer details, recommendation or reminder"
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              value={value}
              onBlur={onBlur}
              onChangeText={onChange}
              error={errors.message?.message}
              className="min-h-32 py-3"
            />
          )}
        />

        <Controller
          control={control}
          name="imageUrl"
          render={({ field: { onBlur, onChange, value } }) => (
            <Input
              label="Image URL"
              placeholder="https://example.com/promo.jpg"
              autoCapitalize="none"
              keyboardType="url"
              value={value}
              onBlur={onBlur}
              onChangeText={onChange}
              error={errors.imageUrl?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="actionUrl"
          render={({ field: { onBlur, onChange, value } }) => (
            <Input
              label="Action URL"
              placeholder="https://example.com/book"
              autoCapitalize="none"
              keyboardType="url"
              value={value}
              onBlur={onBlur}
              onChangeText={onChange}
              error={errors.actionUrl?.message}
            />
          )}
        />

        {errorMessage ? <Text className="text-sm leading-5 text-red-600">{errorMessage}</Text> : null}

        <View className="flex-row gap-3">
          <Button title="Cancel" variant="secondary" className="flex-1" onPress={onCancel} />
          <Button
            title={promotion ? 'Save promotion' : 'Create promotion'}
            loading={isSubmitting}
            className="flex-1"
            onPress={() => void handleSubmit(handleValidSubmit)()}
          />
        </View>
      </View>
    </AppCard>
  );
}

interface SelectorSectionProps {
  children: ReactNode;
  error?: string;
  label: string;
}

function SelectorSection({ children, error, label }: SelectorSectionProps) {
  return (
    <View className="gap-2">
      <Text className="text-sm font-semibold text-slate-700">{label}</Text>
      <View className="flex-row flex-wrap gap-2">{children}</View>
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

function isPromotionFormField(value: unknown): value is PromotionFormField {
  return typeof value === 'string' && promotionFormFields.includes(value as PromotionFormField);
}
