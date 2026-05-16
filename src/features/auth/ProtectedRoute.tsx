import { Redirect } from 'expo-router';
import { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { Button, Card, Screen } from '../../components';
import { useKennels } from '../kennels/KennelProvider';
import { NoKennelOnboarding } from '../kennels/NoKennelOnboarding';
import { AuthLoadingScreen } from './AuthLoadingScreen';
import { useAuth } from './AuthProvider';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isLoading, isProfileLoading, profileError, refreshProfile, session, signOut } = useAuth();
  const { currentKennel, isKennelLoading, kennelError, refreshKennels } = useKennels();

  if (isLoading || (session && (isProfileLoading || isKennelLoading))) {
    return <AuthLoadingScreen />;
  }

  if (!session) {
    return <Redirect href="/auth/login" />;
  }

  if (profileError) {
    return (
      <WorkspaceError
        message={profileError}
        onRetry={refreshProfile}
        onSignOut={signOut}
        title="Unable to prepare your profile"
      />
    );
  }

  if (kennelError) {
    return (
      <WorkspaceError
        message={kennelError}
        onRetry={refreshKennels}
        onSignOut={signOut}
        title="Unable to load your kennel"
      />
    );
  }

  if (!currentKennel) {
    return <NoKennelOnboarding />;
  }

  return <>{children}</>;
}

interface WorkspaceErrorProps {
  message: string;
  onRetry: () => Promise<void>;
  onSignOut: () => Promise<void>;
  title: string;
}

function WorkspaceError({ message, onRetry, onSignOut, title }: WorkspaceErrorProps) {
  return (
    <Screen contentClassName="justify-center">
      <Card>
        <View className="gap-4">
          <View className="gap-2">
            <Text className="text-2xl font-bold text-slate-950">{title}</Text>
            <Text className="text-sm leading-5 text-red-600">{message}</Text>
          </View>
          <Button title="Try again" onPress={() => void onRetry()} />
          <Button title="Log out" variant="secondary" onPress={() => void onSignOut()} />
        </View>
      </Card>
    </Screen>
  );
}
