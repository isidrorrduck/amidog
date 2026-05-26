import * as DocumentPicker from 'expo-document-picker';
import type { ReactNode } from 'react';
import { useEffect, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, Text, View } from 'react-native';

import { Button, AppCard, Input } from '../../components';
import {
  documentEntityTypeOptions,
  documentFormSchema,
  documentTypeOptions,
  getDocumentEntityTypeLabel,
  getDocumentFormDefaultValues,
  getDocumentTypeLabel,
  toDocumentMutationInput,
  type DocumentEntityOption,
  type DocumentEntityType,
  type DocumentFileAsset,
  type DocumentFormValues,
  type DocumentMutationInput,
  type DocumentType,
} from './types';

interface DocumentFormProps {
  defaultDocumentType?: DocumentType | null;
  defaultEntityId?: string | null;
  defaultEntityType?: DocumentEntityType | null;
  entityOptions: DocumentEntityOption[];
  errorMessage?: string | null;
  isSubmitting?: boolean;
  onCancel: () => void;
  onSubmit: (input: DocumentMutationInput) => Promise<void>;
}

const documentFormFields = ['title', 'entityType', 'entityId', 'documentType', 'notes', 'file'] as const;
type DocumentFormField = (typeof documentFormFields)[number];

export function DocumentForm({
  defaultDocumentType,
  defaultEntityId,
  defaultEntityType,
  entityOptions,
  errorMessage,
  isSubmitting = false,
  onCancel,
  onSubmit,
}: DocumentFormProps) {
  const {
    control,
    clearErrors,
    formState: { errors },
    getValues,
    handleSubmit,
    reset,
    setError,
    setValue,
    watch,
  } = useForm<DocumentFormValues>({
    defaultValues: getDocumentFormDefaultValues({
      documentType: defaultDocumentType,
      entityId: defaultEntityId,
      entityType: defaultEntityType,
    }),
  });
  const selectedEntityType = watch('entityType');
  const selectedFile = watch('file');
  const filteredEntityOptions = useMemo(
    () => entityOptions.filter((option) => option.type === selectedEntityType),
    [entityOptions, selectedEntityType],
  );

  useEffect(() => {
    reset(
      getDocumentFormDefaultValues({
        documentType: defaultDocumentType,
        entityId: defaultEntityId,
        entityType: defaultEntityType,
      }),
    );
  }, [defaultDocumentType, defaultEntityId, defaultEntityType, reset]);

  useEffect(() => {
    const entityId = getValues('entityId');

    if (entityId && filteredEntityOptions.length > 0 && !filteredEntityOptions.some((option) => option.id === entityId)) {
      setValue('entityId', '');
    }
  }, [filteredEntityOptions, getValues, setValue]);

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled) {
        return;
      }

      const asset = result.assets[0];

      if (!asset) {
        return;
      }

      const file: DocumentFileAsset = {
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType ?? null,
        size: asset.size ?? null,
      };

      setValue('file', file, { shouldDirty: true, shouldValidate: true });
      clearErrors('file');

      if (!getValues('title').trim()) {
        setValue('title', titleFromFileName(file.name), { shouldDirty: true });
      }
    } catch (error) {
      setError('file', { message: getErrorMessage(error) });
    }
  };

  const handleValidSubmit = async (values: DocumentFormValues) => {
    const result = documentFormSchema.safeParse(values);

    if (!result.success) {
      result.error.issues.forEach((issue) => {
        const field = issue.path[0];

        if (isDocumentFormField(field)) {
          setError(field, { message: issue.message });
        }
      });
      return;
    }

    await onSubmit(toDocumentMutationInput(result.data));
  };

  return (
    <AppCard title="Subir documento">
      <View className="gap-4">
        <Controller
          control={control}
          name="title"
          render={({ field: { onBlur, onChange, value } }) => (
            <Input
              label="Título"
              placeholder="Pedigrí, contrato o informe veterinario"
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
          name="documentType"
          render={({ field: { onChange, value } }) => (
            <SelectorSection label="Tipo de documento" error={errors.documentType?.message}>
              {documentTypeOptions.map((option) => (
                <SelectorOption
                  key={option}
                  label={getDocumentTypeLabel(option)}
                  isSelected={value === option}
                  onPress={() => onChange(option)}
                />
              ))}
            </SelectorSection>
          )}
        />

        <Controller
          control={control}
          name="entityType"
          render={({ field: { onChange, value } }) => (
            <SelectorSection label="Vinculado a" error={errors.entityType?.message}>
              {documentEntityTypeOptions.map((option) => (
                <SelectorOption
                  key={option}
                  label={getDocumentEntityTypeLabel(option)}
                  isSelected={value === option}
                  onPress={() => {
                    onChange(option);
                    setValue('entityId', '');
                  }}
                />
              ))}
            </SelectorSection>
          )}
        />

        <Controller
          control={control}
          name="entityId"
          render={({ field: { onChange, value } }) => (
            <SelectorSection label={getDocumentEntityTypeLabel(selectedEntityType)} error={errors.entityId?.message}>
              {filteredEntityOptions.map((option) => (
                <SelectorOption
                  key={option.id}
                  label={option.label}
                  isSelected={value === option.id}
                  onPress={() => onChange(option.id)}
                />
              ))}
              {filteredEntityOptions.length === 0 ? (
                <Text className="text-sm leading-5 text-slate-600">
                  Crea primero un registro para poder vincular documentos.
                </Text>
              ) : null}
            </SelectorSection>
          )}
        />

        <View className="gap-2">
          <Text className="text-sm font-semibold text-slate-700">Archivo</Text>
          <Button title={selectedFile ? 'Elegir otro archivo' : 'Elegir archivo'} variant="secondary" onPress={pickFile} />
          {selectedFile ? (
            <Text className="text-sm leading-5 text-slate-600">
              {selectedFile.name}
              {selectedFile.size ? ` | ${formatSize(selectedFile.size)}` : ''}
            </Text>
          ) : null}
          {errors.file?.message ? <Text className="text-sm text-red-600">{errors.file.message}</Text> : null}
        </View>

        <Controller
          control={control}
          name="notes"
          render={({ field: { onBlur, onChange, value } }) => (
            <Input
              label="Notas"
              placeholder="Contexto, caducidad, lote de vacuna o notas para compartir"
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
          <Button title="Cancelar" variant="secondary" className="flex-1" onPress={onCancel} />
          <Button
            title="Subir"
            loading={isSubmitting}
            disabled={filteredEntityOptions.length === 0}
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

function titleFromFileName(fileName: string) {
  return fileName.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ').trim();
}

function formatSize(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function getErrorMessage(_error: unknown) {
  return 'No se ha podido elegir el archivo.';
}

function isDocumentFormField(value: unknown): value is DocumentFormField {
  return typeof value === 'string' && documentFormFields.includes(value as DocumentFormField);
}
