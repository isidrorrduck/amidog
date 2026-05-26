import '../global.css';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AppProviders } from '../src/providers/AppProviders';

export default function RootLayout() {
  return (
    <AppProviders>
      <Stack
        screenOptions={{
          headerBackTitle: 'Atrás',
          headerTintColor: '#1d4ed8',
          contentStyle: { backgroundColor: '#f8fafc' },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="auth/login" options={{ headerShown: false }} />
        <Stack.Screen name="auth/register" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="breeders" options={{ title: 'Criadores' }} />
        <Stack.Screen name="dogs" options={{ title: 'Perros' }} />
        <Stack.Screen name="litters" options={{ title: 'Camadas' }} />
        <Stack.Screen name="puppies" options={{ title: 'Cachorros' }} />
        <Stack.Screen name="reservations" options={{ title: 'Reservas' }} />
        <Stack.Screen name="bookings" options={{ title: 'Reservas' }} />
      </Stack>
      <StatusBar style="dark" />
    </AppProviders>
  );
}
