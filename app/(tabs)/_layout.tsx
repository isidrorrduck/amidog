import { Tabs } from 'expo-router';

import { ProtectedRoute } from '../../src/features/auth';
import { tokens } from '../../src/theme';

export default function TabsLayout() {
  return (
    <ProtectedRoute>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: tokens.colors.brand[600],
          tabBarInactiveTintColor: tokens.colors.textMuted,
        }}
      >
        <Tabs.Screen name="index" options={{ href: null }} />
        <Tabs.Screen name="home" options={{ title: 'Inicio' }} />
        <Tabs.Screen name="profile" options={{ title: 'Perfil' }} />
      </Tabs>
    </ProtectedRoute>
  );
}
