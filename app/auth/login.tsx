import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { z } from 'zod';

import { Button, Card, Input, Screen } from '../../src/components';
import { AuthLoadingScreen, useAuth } from '../../src/features/auth';
import { env } from '../../src/lib/env';

const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email.'),
  password: z.string().min(1, 'Enter your password.'),
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
      setFormError(result.error.issues[0]?.message ?? 'Check your login details.');
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
    <Screen contentClassName="justify-center">
      <View className="mb-8 gap-2">
        <Text className="text-4xl font-bold text-slate-950">Welcome back</Text>
        <Text className="text-base leading-6 text-slate-600">
          Sign in to enter your kennel workspace.
        </Text>
      </View>

      <Card>
        <View className="gap-4">
          <Input
            label="Email"
            placeholder="you@example.com"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <Input
            label="Password"
            placeholder="Password"
            autoComplete="password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          {!isSupabaseConfigured ? (
            <Text className="text-sm leading-5 text-red-600">{getSupabaseConfigMessage()}</Text>
          ) : null}
          {formError ? <Text className="text-sm leading-5 text-red-600">{formError}</Text> : null}
          <Button title="Log in" loading={isSubmitting} disabled={!isSupabaseConfigured} onPress={handleSubmit} />
          <Button title="Create account" variant="secondary" onPress={() => router.push('/auth/register')} />
        </View>
      </Card>
    </Screen>
  );
}

function getSupabaseConfigMessage() {
  return env.validationErrors[0] ?? 'Add Supabase URL and anon key to your .env file before signing in.';
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unable to log in. Please try again.';
}
