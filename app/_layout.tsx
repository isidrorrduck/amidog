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
          headerBackTitle: 'Back',
          headerTintColor: tokens.colors.brand[600],
          contentStyle: { backgroundColor: tokens.colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="auth/login" options={{ headerShown: false }} />
        <Stack.Screen name="auth/register" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="breeders" options={{ title: 'Breeders' }} />
        <Stack.Screen name="dogs" options={{ title: 'Dogs' }} />
        <Stack.Screen name="litters" options={{ title: 'Litters' }} />
        <Stack.Screen name="puppies" options={{ title: 'Puppies' }} />
        <Stack.Screen name="reservations" options={{ title: 'Reservations' }} />
        <Stack.Screen name="documents" options={{ title: 'Documents' }} />
        <Stack.Screen name="promotions" options={{ title: 'Promotions' }} />
        <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
        <Stack.Screen name="bookings" options={{ title: 'Bookings' }} />
      </Stack>
      <StatusBar style="dark" />
    </AppProviders>
  );
}
