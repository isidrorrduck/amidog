import { Redirect } from 'expo-router';
import { ReactNode } from 'react';

import { AuthLoadingScreen } from './AuthLoadingScreen';
import { useAuth } from './AuthProvider';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isLoading, session } = useAuth();

  if (isLoading) {
    return <AuthLoadingScreen />;
  }

  if (!session) {
    return <Redirect href="/auth/login" />;
  }

  return <>{children}</>;
}
