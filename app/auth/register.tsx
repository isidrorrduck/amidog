import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { z } from 'zod';

import { Button, AppCard, Input, AppScreen } from '../../src/components';
import { AuthLoadingScreen, useAuth } from '../../src/features/auth';
import { env } from '../../src/lib/env';

const registerSchema = z
  .object({
    kennelName: z.string().trim().min(2, 'Introduce el nombre del criadero.'),
    email: z.string().trim().email('Introduce un correo electrónico válido.'),
    password: z.string().min(8, 'Usa al menos 8 caracteres.'),
    confirmPassword: z.string().min(1, 'Confirma tu contraseña.'),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'Las contraseñas no coinciden.',
    path: ['confirmPassword'],
  });

export default function RegisterScreen() {
  const { isLoading, isSupabaseConfigured, register, session } = useAuth();
  const [kennelName, setKennelName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isLoading) {
    return <AuthLoadingScreen />;
  }

  if (session) {
    return <Redirect href="/(tabs)/home" />;
  }

  const handleSubmit = async () => {
    const result = registerSchema.safeParse({
      kennelName,
      email,
      password,
      confirmPassword,
    });

    if (!result.success) {
      setFormError(result.error.issues[0]?.message ?? 'Revisa los datos de la cuenta.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    setSuccessMessage(null);

    try {
      const signUpResult = await register({
        kennelName: result.data.kennelName,
        email: result.data.email,
        password: result.data.password,
      });

      if (signUpResult.needsEmailConfirmation) {
        setSuccessMessage('Revisa tu correo para confirmar la cuenta y luego inicia sesión para terminar la configuración.');
        return;
      }

      router.replace('/(tabs)/home');
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppScreen contentClassName="justify-center">
      <View className="mb-8 gap-2">
        <Text className="text-4xl font-bold text-slate-950">Crear criadero</Text>
        <Text className="text-base leading-6 text-slate-600">
          Configura la primera cuenta de Amidog.
        </Text>
      </View>

      <AppCard>
        <View className="gap-4">
          <Input label="Nombre del criadero" placeholder="Criadero Valle del Roble" value={kennelName} onChangeText={setKennelName} />
          <Input
            label="Correo electrónico"
            placeholder="tu@email.com"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <Input
            label="Contraseña"
            placeholder="Contraseña"
            autoComplete="new-password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <Input
            label="Confirmar contraseña"
            placeholder="Contraseña"
            autoComplete="new-password"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
          {!isSupabaseConfigured ? (
            <Text className="text-sm leading-5 text-red-600">{getSupabaseConfigMessage()}</Text>
          ) : null}
          {formError ? <Text className="text-sm leading-5 text-red-600">{formError}</Text> : null}
          {successMessage ? <Text className="text-sm leading-5 text-brand-700">{successMessage}</Text> : null}
          <Button title="Registrarse" loading={isSubmitting} disabled={!isSupabaseConfigured} onPress={handleSubmit} />
          <Button title="Ya tengo cuenta" variant="secondary" onPress={() => router.replace('/auth/login')} />
        </View>
      </AppCard>
    </AppScreen>
  );
}

function getSupabaseConfigMessage() {
  return env.validationErrors[0] ?? 'Añade la URL de Supabase y la clave anon al archivo .env antes de registrarte.';
}

function getErrorMessage(_error: unknown) {
  return 'No se ha podido crear la cuenta. Revisa los datos e inténtalo de nuevo.';
}
