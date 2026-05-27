import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';

import { AuthProvider } from '../features/auth';
import { KennelProvider } from '../features/kennels';
import { PushNotificationsRegistrar } from '../features/notifications';

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            staleTime: 1000 * 30,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <KennelProvider>
          <PushNotificationsRegistrar />
          {children}
        </KennelProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
