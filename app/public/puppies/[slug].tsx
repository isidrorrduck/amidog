import { Stack, useLocalSearchParams } from 'expo-router';
import Head from 'expo-router/head';
import { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text } from 'react-native';

import { PuppyOwnerExperience } from '../../../src/features/puppies';
import { SG_SERVICE_PUBLIC_OWNER_BRANDING } from '../../../src/features/puppies/publicOwnerBranding';
import {
  getProvisionalPublicPuppyBySlug,
  getPublicPuppyBySlug,
  type PublicPuppyOwnerData,
} from '../../../src/features/puppies/publicOwnerData';
import { THOR_PWA_ASSETS } from '../../../src/features/pwa';

interface PublicPuppyOwnerRouteProps {
  slugOverride?: string;
}

export default function PublicPuppyOwnerRoute({ slugOverride }: PublicPuppyOwnerRouteProps = {}) {
  const { slug } = useLocalSearchParams<{ slug?: string | string[] }>();
  const publicSlug = slugOverride ?? asString(slug);
  const provisionalData = getProvisionalPublicPuppyBySlug(publicSlug);
  const [publicData, setPublicData] = useState<PublicPuppyOwnerData | null>(provisionalData);
  const [isLoading, setIsLoading] = useState(!provisionalData);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (provisionalData) return;

    let isActive = true;
    setIsLoading(true);
    setLoadError(null);

    void getPublicPuppyBySlug(publicSlug)
      .then((data) => {
        if (isActive) setPublicData(data);
      })
      .catch(() => {
        if (isActive) setLoadError('No hemos podido cargar la experiencia. Inténtalo de nuevo en unos minutos.');
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [provisionalData, publicSlug]);

  const puppyName = publicData?.puppy.name ?? 'AmiDog';

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Head>
        <title>{`AmiDog · ${puppyName}`}</title>
        <meta name="application-name" content={`AmiDog · ${puppyName}`} />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content={puppyName} />
        <meta name="description" content={`El espacio personal de ${puppyName} en AmiDog.`} />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#F7F5F1" />
        <link rel="apple-touch-icon" sizes="180x180" href={THOR_PWA_ASSETS.appleTouchIcon} />
        <link rel="icon" type="image/png" href={THOR_PWA_ASSETS.favicon} />
        <link rel="manifest" href={THOR_PWA_ASSETS.manifest} />
      </Head>
      {isLoading ? (
        <PublicMessage title="Preparando el espacio" body="Estamos cargando la experiencia de tu cachorro…" loading />
      ) : loadError ? (
        <PublicMessage title="No se ha podido cargar" body={loadError} />
      ) : publicData?.experienceStatus === 'published' ? (
        <PuppyOwnerExperience
          allowOwnerPhotoEditing
          breed={publicData.breed}
          publicBranding={SG_SERVICE_PUBLIC_OWNER_BRANDING}
          puppy={publicData.puppy}
          showPwaInstall
        />
      ) : publicData ? (
        <PublicMessage
          title="La experiencia está en preparación"
          body={`Estamos preparando el espacio de ${publicData.puppy.name}. Esta misma URL estará disponible cuando esté listo.`}
        />
      ) : (
        <PublicMessage title="Cachorro no encontrado" body="Comprueba que el enlace sea correcto." />
      )}
    </>
  );
}

function PublicMessage({ body, loading = false, title }: { body: string; loading?: boolean; title: string }) {
  return (
    <SafeAreaView style={styles.centered}>
      {loading ? <ActivityIndicator color="#2563EB" style={styles.loader} /> : null}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
    </SafeAreaView>
  );
}

function asString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: '#F7F5F1' },
  title: { fontSize: 22, fontWeight: '600', color: '#211F1C', textAlign: 'center' },
  body: { marginTop: 8, fontSize: 15, color: '#77716A', textAlign: 'center' },
  loader: { marginBottom: 16 },
});
