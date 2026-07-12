import { Stack, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, StyleSheet, Text } from 'react-native';

import { PuppyOwnerExperience } from '../../../src/features/puppies';
import { getProvisionalPublicPuppyBySlug } from '../../../src/features/puppies/publicOwnerData';

interface PublicPuppyOwnerRouteProps {
  slugOverride?: string;
}

export default function PublicPuppyOwnerRoute({ slugOverride }: PublicPuppyOwnerRouteProps = {}) {
  const { slug } = useLocalSearchParams<{ slug?: string | string[] }>();
  const publicData = getProvisionalPublicPuppyBySlug(slugOverride ?? asString(slug));

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      {publicData ? (
        <PuppyOwnerExperience breed={publicData.breed} puppy={publicData.puppy} />
      ) : (
        <SafeAreaView style={styles.centered}>
          <Text style={styles.title}>Cachorro no encontrado</Text>
          <Text style={styles.body}>Comprueba que el enlace sea correcto.</Text>
        </SafeAreaView>
      )}
    </>
  );
}

function asString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: '#F7F5F1' },
  title: { fontSize: 22, fontWeight: '600', color: '#211F1C', textAlign: 'center' },
  body: { marginTop: 8, fontSize: 15, color: '#77716A', textAlign: 'center' },
});
