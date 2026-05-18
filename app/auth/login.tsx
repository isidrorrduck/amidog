import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { z } from 'zod';

import { Button, AppCard, Input, AppScreen } from '../../src/components';
import { AuthLoadingScreen, useAuth } from '../../src/features/auth';
import { env } from '../../src/lib/env';

const loginSchema = z.object({
  email: z.string().trim().email('Introduce un correo electrónico válido.'),
  password: z.string().min(1, 'Introduce tu contraseña.'),
});

export default function LoginScreen() {
  const { isLoading, isSupabaseConfigured, session, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isLoading) {
    return <AuthLoadingScreen />;
  }

  if (session) {
    return <Redirect href="/(tabs)/home" />;
  }

  const handleSubmit = async () => {
    const result = loginSchema.safeParse({ email, password });

    if (!result.success) {
      setFormError(result.error.issues[0]?.message ?? 'Revisa los datos de acceso.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      await signIn(result.data.email, result.data.password);
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
        <Text className="text-4xl font-bold text-slate-950">Bienvenido de nuevo</Text>
        <Text className="text-base leading-6 text-slate-600">
          Inicia sesión para entrar en el espacio de tu criadero.
        </Text>
      </View>

      <AppCard>
        <View className="gap-4">
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
            autoComplete="password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          {!isSupabaseConfigured ? (
            <Text className="text-sm leading-5 text-red-600">{getSupabaseConfigMessage()}</Text>
          ) : null}
          {formError ? <Text className="text-sm leading-5 text-red-600">{formError}</Text> : null}
          <Button title="Iniciar sesión" loading={isSubmitting} disabled={!isSupabaseConfigured} onPress={handleSubmit} />
          <Button title="Crear cuenta" variant="secondary" onPress={() => router.push('/auth/register')} />
        </View>
      </AppCard>
    </AppScreen>
  );
}

function getSupabaseConfigMessage() {
  return env.validationErrors[0] ?? 'Añade la URL de Supabase y la clave anon al archivo .env antes de iniciar sesión.';
}

function getErrorMessage(_error: unknown) {
  return 'No se ha podido iniciar sesión. Revisa el correo y la contraseña.';
}
