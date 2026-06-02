import { router } from 'expo-router';
import { useMemo } from 'react';
import { Alert, Linking, Text, View } from 'react-native';

import { AppCard, AppScreen, Button, EmptyState, LoadingState, ScreenHeader } from '../../components';
import { ProtectedRoute } from '../auth';
import { useDogs, type Dog } from '../dogs';
import { getHealthEventTypeLabel, usePuppyHealthEvents, type HealthEvent } from '../health';
import { useCurrentKennel } from '../kennels';
import { useLitters, type Litter } from '../litters';
import { getPuppySexLabel, getPuppyStatusLabel, type Puppy } from './types';
import { usePuppies } from './usePuppies';

const OWNER_RECOMMENDATIONS_URL = 'https://www.sgservice.es/clinica-veterinaria-san-cristobal/';
const BREEDER_NAME = 'Marlenne';

interface PuppyOwnerPreviewScreenProps {
  puppyId?: string | null;
}

export function PuppyOwnerPreviewScreen({ puppyId }: PuppyOwnerPreviewScreenProps) {
  return (
    <ProtectedRoute>
      <PuppyOwnerPreviewContent puppyId={puppyId} />
    </ProtectedRoute>
  );
}

function PuppyOwnerPreviewContent({ puppyId }: PuppyOwnerPreviewScreenProps) {
  const { currentKennel } = useCurrentKennel();
  const kennelId = currentKennel?.id ?? null;
  const puppiesQuery = usePuppies(kennelId);
  const littersQuery = useLitters(kennelId);
  const dogsQuery = useDogs(kennelId);
  const puppies = puppiesQuery.data ?? [];
  const litters = littersQuery.data ?? [];
  const dogs = dogsQuery.data ?? [];
  const puppy = puppyId ? puppies.find((item) => item.id === puppyId) ?? null : null;
  const littersById = useMemo(() => new Map(litters.map((litter) => [litter.id, litter])), [litters]);
  const dogsById = useMemo(() => new Map(dogs.map((dog) => [dog.id, dog])), [dogs]);
  const litter = puppy ? littersById.get(puppy.litter_id) ?? null : null;
  const breed = getBreedLabel(litter, dogsById);
  const isLoading = puppiesQuery.isLoading || littersQuery.isLoading || dogsQuery.isLoading;
  const hasError = puppiesQuery.error || littersQuery.error || dogsQuery.error;

  const handleOpenRecommendation = async () => {
    try {
      await Linking.openURL(OWNER_RECOMMENDATIONS_URL);
    } catch {
      Alert.alert(
        'No se ha podido abrir el enlace',
        'Inténtalo de nuevo o abre la web de SG Service desde el navegador.',
      );
    }
  };

  return (
    <AppScreen scrollable contentClassName="gap-4">
      <ScreenHeader
        title="Propietario del cachorro"
        subtitle="Una vista sencilla y cercana para acompañar sus primeros meses."
        action={
          <Button
            title="Volver"
            variant="secondary"
            onPress={() => router.replace(puppyId ? (`/puppies/${puppyId}` as never) : ('/puppies' as never))}
          />
        }
      />

      {isLoading ? <LoadingState title="Cargando vista" message="Preparando la experiencia del propietario." /> : null}

      {hasError ? (
        <AppCard title="No se ha podido cargar la vista" className="border-red-200 bg-red-50">
          <Text className="text-sm leading-5 text-red-600">Inténtalo de nuevo en unos segundos.</Text>
        </AppCard>
      ) : null}

      {!isLoading && !hasError && !puppy ? (
        <EmptyState
          title="Cachorro no encontrado"
          message="No se ha encontrado este cachorro en el criadero actual."
          actionLabel="Volver a cachorros"
          onAction={() => router.replace('/puppies' as never)}
        />
      ) : null}

      {puppy ? (
        <>
          <OwnerPuppyCard puppy={puppy} breed={breed} />
          <OwnerHealthSection kennelId={kennelId} puppy={puppy} />
          <BreederCard />
          <OwnerRecommendationCard
            actionLabel="Comprar alimentación"
            body="Esta es la alimentación recomendada por tu criadora durante la etapa de crecimiento."
            product="Dibaq Sense Puppy"
            title="🥣 Alimentación recomendada"
            onPress={handleOpenRecommendation}
          />
          <OwnerRecommendationCard
            actionLabel="Más información"
            body="Protege la salud de tu cachorro con el seguro recomendado por tu criadora."
            product="Seguro Veterinario Premium"
            title="🛡 Seguro recomendado"
            onPress={handleOpenRecommendation}
          />
        </>
      ) : null}
    </AppScreen>
  );
}

interface OwnerPuppyCardProps {
  breed: string;
  puppy: Puppy;
}

function OwnerPuppyCard({ breed, puppy }: OwnerPuppyCardProps) {
  return (
    <AppCard className="border-brand-100 bg-brand-50">
      <View className="gap-4">
        <View className="flex-row items-center gap-4">
          <View className="h-20 w-20 items-center justify-center rounded-full border border-white bg-white">
            <Text className="text-4xl">🐶</Text>
          </View>
          <View className="min-w-0 flex-1 gap-1">
            <Text className="text-sm font-semibold text-brand-700">Mi cachorro</Text>
            <Text className="text-3xl font-bold leading-9 text-ink" numberOfLines={2}>
              {puppy.name || 'Cachorro sin nombre'}
            </Text>
          </View>
        </View>

        <View className="gap-2 rounded-lg border border-white bg-white p-4">
          <OwnerInfoLine label="Raza" value={breed} />
          <OwnerInfoLine label="Sexo" value={getPuppySexLabel(puppy.sex)} />
          <OwnerInfoLine
            label="Fecha de nacimiento"
            value={puppy.birth_date ? formatIsoDate(puppy.birth_date) : 'Sin fecha registrada'}
          />
          <OwnerInfoLine label="Estado" value={getPuppyStatusLabel(puppy.status)} />
        </View>
      </View>
    </AppCard>
  );
}

interface OwnerHealthSectionProps {
  kennelId: string | null;
  puppy: Puppy;
}

function OwnerHealthSection({ kennelId, puppy }: OwnerHealthSectionProps) {
  const healthEventsQuery = usePuppyHealthEvents(kennelId, puppy.id);
  const events = healthEventsQuery.data ?? [];

  if (healthEventsQuery.isLoading) {
    return <LoadingState title="Cargando salud" message="Preparando el historial de salud del cachorro." />;
  }

  if (healthEventsQuery.error) {
    return (
      <AppCard title="Historial de salud" className="border-red-200 bg-red-50">
        <Text className="text-sm leading-5 text-red-600">
          No se ha podido cargar el historial de salud en este momento.
        </Text>
      </AppCard>
    );
  }

  return (
    <AppCard title="Historial de salud" subtitle="Cuidados y revisiones registrados por el criadero.">
      {events.length === 0 ? (
        <Text className="text-sm leading-5 text-muted">
          Todavía no hay eventos de salud registrados para este cachorro.
        </Text>
      ) : (
        <View className="gap-4">
          {events.map((event, index) => (
            <OwnerHealthEventItem event={event} isFirst={index === 0} key={event.id} />
          ))}
        </View>
      )}
    </AppCard>
  );
}

interface OwnerHealthEventItemProps {
  event: HealthEvent;
  isFirst: boolean;
}

function OwnerHealthEventItem({ event, isFirst }: OwnerHealthEventItemProps) {
  return (
    <View className={`${isFirst ? '' : 'border-t border-border pt-4'} gap-2`}>
      <View className="flex-row flex-wrap items-center gap-2">
        <View className="rounded-full border border-brand-100 bg-brand-50 px-3 py-1">
          <Text className="text-xs font-semibold text-brand-700">{getHealthEventTypeLabel(event.event_type)}</Text>
        </View>
        <Text className="text-xs font-semibold uppercase text-muted">{formatIsoDate(event.event_date)}</Text>
      </View>
      <Text className="text-base font-semibold text-ink">{event.title}</Text>
      {event.notes ? <Text className="text-sm leading-5 text-muted">{event.notes}</Text> : null}
    </View>
  );
}

function BreederCard() {
  return (
    <AppCard className="border-rose-100 bg-rose-50">
      <View className="gap-4">
        <View className="gap-1">
          <Text className="text-sm font-semibold text-rose-700">👩 Criador</Text>
          <Text className="text-2xl font-bold text-ink">{BREEDER_NAME}</Text>
          <Text className="text-sm leading-5 text-muted">
            Tu criadora sigue disponible para ayudarte durante el crecimiento de tu cachorro.
          </Text>
        </View>

        <View className="flex-row gap-3">
          <ContactPlaceholder label="WhatsApp" />
          <ContactPlaceholder label="Teléfono" />
        </View>
      </View>
    </AppCard>
  );
}

function ContactPlaceholder({ label }: { label: string }) {
  return (
    <View className="flex-1 rounded-lg border border-rose-100 bg-white px-3 py-3">
      <Text className="text-sm font-semibold text-ink">{label}</Text>
      <Text className="text-xs font-semibold uppercase text-muted">Placeholder</Text>
    </View>
  );
}

interface OwnerRecommendationCardProps {
  actionLabel: string;
  body: string;
  product: string;
  title: string;
  onPress: () => void;
}

function OwnerRecommendationCard({ actionLabel, body, product, title, onPress }: OwnerRecommendationCardProps) {
  return (
    <AppCard>
      <View className="gap-3">
        <View className="gap-1">
          <Text className="text-lg font-semibold text-ink">{title}</Text>
          <Text className="text-xl font-bold text-ink">{product}</Text>
          <Text className="text-sm leading-5 text-muted">{body}</Text>
        </View>
        <Button title={actionLabel} onPress={onPress} />
      </View>
    </AppCard>
  );
}

interface OwnerInfoLineProps {
  label: string;
  value: string;
}

function OwnerInfoLine({ label, value }: OwnerInfoLineProps) {
  return (
    <View className="flex-row items-start justify-between gap-3">
      <Text className="text-sm font-semibold text-muted">{label}</Text>
      <Text className="min-w-0 flex-1 text-right text-sm leading-5 text-ink" numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function getBreedLabel(litter: Litter | null, dogsById: Map<string, Dog>) {
  const motherBreed = litter?.mother_id ? dogsById.get(litter.mother_id)?.breed : null;
  const fatherBreed = litter?.father_id ? dogsById.get(litter.father_id)?.breed : null;

  if (motherBreed && fatherBreed && motherBreed !== fatherBreed) {
    return `${motherBreed} / ${fatherBreed}`;
  }

  return motherBreed || fatherBreed || 'Raza no registrada';
}

function formatIsoDate(value: string) {
  const [year, month, day] = value.split('-');

  return year && month && day ? `${day}/${month}/${year}` : value;
}
