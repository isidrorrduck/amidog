import '../global.css';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AppProviders } from '../src/providers/AppProviders';
import { tokens } from '../src/theme';

export default function RootLayout() {
  return (
    <AppProviders>
      <Stack
        screenOptions={{
          headerBackTitle: 'Atrás',
          headerTintColor: tokens.colors.brand[600],
          contentStyle: { backgroundColor: tokens.colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="auth/login" options={{ headerShown: false }} />
        <Stack.Screen name="auth/register" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="breeders" options={{ title: 'Criadores' }} />
        <Stack.Screen name="dogs/index" options={{ title: 'Perros' }} />
        <Stack.Screen name="litters" options={{ title: 'Camadas' }} />
        <Stack.Screen name="puppies" options={{ title: 'Cachorros' }} />
        <Stack.Screen name="reservations" options={{ title: 'Reservas' }} />
        <Stack.Screen name="documents" options={{ title: 'Documentos' }} />
        <Stack.Screen name="promotions" options={{ title: 'Promociones' }} />
        <Stack.Screen name="notifications" options={{ title: 'Notificaciones' }} />
        <Stack.Screen name="bookings" options={{ title: 'Reservas' }} />
      </Stack>
      <StatusBar style="dark" />
    </AppProviders>
  );
}
