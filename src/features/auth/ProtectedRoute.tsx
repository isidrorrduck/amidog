import { Redirect } from 'expo-router';
import { ReactNode } from 'react';

import { useKennels } from '../kennels/KennelProvider';
import { NoKennelOnboarding } from '../kennels/NoKennelOnboarding';
import { AuthLoadingScreen } from './AuthLoadingScreen';
import { useAuth } from './AuthProvider';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isLoading, session } = useAuth();
  const { currentKennel, isKennelLoading } = useKennels();

  if (isLoading || (session && isKennelLoading)) {
    return <AuthLoadingScreen />;
  }

  if (!session) {
    return <Redirect href="/auth/login" />;
  }

  if (!currentKennel) {
    return <NoKennelOnboarding />;
  }

  return <>{children}</>;
}
