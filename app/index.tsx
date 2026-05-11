import { Redirect } from 'expo-router';

import { AuthLoadingScreen, useAuth } from '../src/features/auth';

export default function IndexRoute() {
  const { isLoading, session } = useAuth();

  if (isLoading) {
    return <AuthLoadingScreen />;
  }

  return <Redirect href={session ? '/(tabs)/home' : '/auth/login'} />;
}
