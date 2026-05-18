import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { z } from 'zod';

import { Button, AppCard, Input, AppScreen } from '../../src/components';
import { AuthLoadingScreen, useAuth } from '../../src/features/auth';
import { env } from '../../src/lib/env';

const registerSchema = z
  .object({
    kennelName: z.string().trim().min(2, 'Enter a kennel name.'),
    email: z.string().trim().email('Enter a valid email.'),
    password: z.string().min(8, 'Use at least 8 characters.'),
    confirmPassword: z.string().min(1, 'Confirm your password.'),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'Passwords do not match.',
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
      setFormError(result.error.issues[0]?.message ?? 'Check your account details.');
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
        setSuccessMessage('Check your email to confirm the account, then log in to finish workspace setup.');
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
        <Text className="text-4xl font-bold text-slate-950">Create kennel</Text>
        <Text className="text-base leading-6 text-slate-600">
          Set up the first account shell for Amidog.
        </Text>
      </View>

      <AppCard>
        <View className="gap-4">
          <Input label="Kennel name" placeholder="Oak Valley Kennels" value={kennelName} onChangeText={setKennelName} />
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
            autoComplete="new-password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <Input
            label="Confirm password"
            placeholder="Password"
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
          <Button title="Register" loading={isSubmitting} disabled={!isSupabaseConfigured} onPress={handleSubmit} />
          <Button title="I already have an account" variant="secondary" onPress={() => router.replace('/auth/login')} />
        </View>
      </AppCard>
    </AppScreen>
  );
}

function getSupabaseConfigMessage() {
  return env.validationErrors[0] ?? 'Add Supabase URL and anon key to your .env file before registering.';
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unable to create the account. Please try again.';
}
