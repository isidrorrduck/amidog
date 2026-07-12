import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { EmptyState, LoadingState } from '../../components';
import { ProtectedRoute } from '../auth';
import { useDogs, type Dog } from '../dogs';
import { getHealthEventTypeLabel, usePuppyHealthEvents, type HealthEvent } from '../health';
import { useCurrentKennel } from '../kennels';
import { useLitters, type Litter } from '../litters';
import { getPuppySexLabel, type Puppy } from './types';
import { usePuppies } from './usePuppies';

export const FOOD_CHECKOUT_URL = 'https://www.sgservice.es/cart/?add-to-cart=23';
// TODO: Replace with the direct external Santévet landing URL when it is available.
const SANTEVET_URL = 'https://www.sgservice.es/clinica-veterinaria-san-cristobal/';
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
  const littersById = useMemo(() => new Map(litters.map((item) => [item.id, item])), [litters]);
  const dogsById = useMemo(() => new Map(dogs.map((item) => [item.id, item])), [dogs]);
  const litter = puppy ? littersById.get(puppy.litter_id) ?? null : null;
  const breed = getBreedLabel(litter, dogsById);
  const isLoading = puppiesQuery.isLoading || littersQuery.isLoading || dogsQuery.isLoading;
  const hasError = puppiesQuery.error || littersQuery.error || dogsQuery.error;

  if (isLoading) {
    return <LoadingState title="Preparando su espacio" message="Un momento, por favor." />;
  }

  if (hasError) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.errorTitle}>No hemos podido abrir este espacio</Text>
        <Text style={styles.errorBody}>Inténtalo de nuevo en unos segundos.</Text>
      </SafeAreaView>
    );
  }

  if (!puppy) {
    return (
      <EmptyState
        title="Cachorro no encontrado"
        message="No se ha encontrado este cachorro en el criadero actual."
        actionLabel="Volver a cachorros"
        onAction={() => router.replace('/puppies' as never)}
      />
    );
  }

  return <PuppyOwnerExperience brandName={currentKennel?.name ?? ''} breed={breed} healthKennelId={kennelId} puppy={puppy} showHealth showPrivateLabel />;
}

export interface PuppyOwnerExperienceProps {
  brandName?: string;
  breed: string;
  healthKennelId?: string | null;
  puppy: Puppy;
  showHealth?: boolean;
  showPrivateLabel?: boolean;
}

/** Shared presentation for the authenticated preview and the public web route. */
export function PuppyOwnerExperience({ brandName = 'AmiDog', breed, healthKennelId = null, puppy, showHealth = false, showPrivateLabel = false }: PuppyOwnerExperienceProps) {
  const [foodInfoVisible, setFoodInfoVisible] = useState(false);

  const handleOpenExternalUrl = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('No se ha podido abrir el enlace', 'Inténtalo de nuevo en unos segundos.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.page}>
        <View style={styles.brandRow}>
          <Text style={styles.brand}>{brandName}</Text>
          {showPrivateLabel ? <Text style={styles.privateLabel}>ESPACIO PRIVADO</Text> : null}
        </View>

        <Hero puppy={puppy} breed={breed} />

        <FoodRecommendationCard
          onContinue={() => handleOpenExternalUrl(FOOD_CHECKOUT_URL)}
          onMoreInformation={() => setFoodInfoVisible(true)}
        />
        <InsuranceCard onPress={() => handleOpenExternalUrl(SANTEVET_URL)} />
        <ContactCard />

        {showHealth ? <OwnerHealthSection kennelId={healthKennelId} puppy={puppy} /> : null}

        <View style={styles.footer}>
          <Text style={styles.footerMark}>AmiDog</Text>
          <Text style={styles.footerText}>El espacio personal de {puppy.name}</Text>
        </View>
      </ScrollView>
      <FoodInformationModal
        visible={foodInfoVisible}
        onClose={() => setFoodInfoVisible(false)}
        onContinue={() => handleOpenExternalUrl(FOOD_CHECKOUT_URL)}
      />
    </SafeAreaView>
  );
}

function Hero({ breed, puppy }: { breed: string; puppy: Puppy }) {
  return (
    <View>
      <View style={styles.photoFrame}>
        {puppy.photo_url ? (
          <Image source={{ uri: puppy.photo_url }} resizeMode="cover" style={styles.photo} />
        ) : (
          <View style={styles.photoFallback}>
            <Text style={styles.photoInitial}>{(puppy.name || '?').slice(0, 1).toUpperCase()}</Text>
          </View>
        )}
        <View style={styles.photoShade} />
        <View style={styles.photoCaption}>
          <Text style={styles.heroName}>{puppy.name || 'Cachorro sin nombre'}</Text>
          <Text style={styles.identifier}>{formatIdentifier(puppy.id)}</Text>
        </View>
      </View>

      <View style={styles.facts}>
        <Fact label="Raza" value={breed} />
        <View style={styles.factDivider} />
        <Fact label="Nacimiento" value={puppy.birth_date ? formatIsoDate(puppy.birth_date) : 'Sin registrar'} />
        <View style={styles.factDivider} />
        <Fact label="Sexo" value={getPuppySexLabel(puppy.sex)} />
      </View>
    </View>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text numberOfLines={2} style={styles.factValue}>{value}</Text>
    </View>
  );
}

function FoodRecommendationCard({
  onContinue,
  onMoreInformation,
}: {
  onContinue: () => void;
  onMoreInformation: () => void;
}) {
  const [panelsWidth, setPanelsWidth] = useState(0);
  const gap = 8;
  const panelsInRow = panelsWidth >= 768;
  const panelWidth = panelsInRow ? (panelsWidth - gap) / 2 : panelsWidth;
  const panelHeight = panelWidth * (1024 / 768);

  return (
    <View style={styles.commercialSection}>
      <View style={styles.commercialHeading}>
        <Text style={styles.sectionTitle}>Alimentación recomendada</Text>
      </View>

      <View style={styles.productCard}>
        <View
          onLayout={(event) => {
            const measuredWidth = event.nativeEvent.layout.width;
            setPanelsWidth((currentWidth) => currentWidth === measuredWidth ? currentWidth : measuredWidth);
          }}
          style={[styles.panelsContainer, { flexDirection: panelsInRow ? 'row' : 'column' }]}
        >
          {panelsWidth > 0 ? (
            <>
              <Pressable
                accessibilityLabel="Parte izquierda del pack de alimentación Dibaq. Comprar ahora"
                accessibilityRole="button"
                onPress={onContinue}
                style={{ width: panelWidth, height: panelHeight, flexShrink: 0 }}
              >
                <Image
                  resizeMode="contain"
                  source={require('../../../assets/Dibaq/card-alimentacion-pack-left.png')}
                  style={{ width: panelWidth, height: panelHeight }}
                />
              </Pressable>
              <Pressable
                accessibilityLabel="Parte derecha del pack de alimentación Dibaq. Comprar ahora"
                accessibilityRole="button"
                onPress={onContinue}
                style={{ width: panelWidth, height: panelHeight, flexShrink: 0 }}
              >
                <Image
                  resizeMode="contain"
                  source={require('../../../assets/Dibaq/card-alimentacion-pack-right.png')}
                  style={{ width: panelWidth, height: panelHeight }}
                />
              </Pressable>
            </>
          ) : null}
        </View>

        <View style={styles.foodActions}>
          <PrimaryButton label="Comprar ahora" onPress={onContinue} />
          <Pressable
            accessibilityRole="button"
            onPress={onMoreInformation}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.cardPressed]}
          >
            <Text style={styles.secondaryButtonText}>Ver información nutricional</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function FoodInformationModal({
  onClose,
  onContinue,
  visible,
}: {
  onClose: () => void;
  onContinue: () => void;
  visible: boolean;
}) {
  return (
    <Modal animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen" visible={visible}>
      <SafeAreaView style={styles.modalSafeArea}>
        <View style={styles.modalHeader}>
          <View>
            <Text style={styles.modalEyebrow}>ALIMENTACIÓN</Text>
            <Text style={styles.modalTitle}>Información nutricional</Text>
          </View>
          <Pressable accessibilityLabel="Cerrar" accessibilityRole="button" hitSlop={10} onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>×</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator>
          <ModalSection title="Por qué se recomienda" body="Receta hipoalergénica elaborada con carne fresca de pollo, frutas, verduras y plantas naturales." />
          <ModalList title="Ingredientes principales" items={['Pollo fresco y deshidratado', 'Arroz', 'Guisantes', 'Patata', 'Mango', 'Manzana', 'Judías verdes', 'Prebióticos naturales']} />
          <ModalSection title="Composición resumida" body="Una combinación equilibrada de proteína de pollo, arroz, vegetales, fruta y fuentes naturales de fibra." />
          <ModalList title="Beneficios" items={['Alta digestibilidad', 'Protección articular', 'Ingredientes naturales', 'Sin trigo, soja ni huevo', 'Adecuado para cachorros y madres en gestación o lactancia']} />
          <ModalSection title="Recomendaciones de uso" body="Introduce cualquier cambio de alimentación de forma gradual y mantén siempre agua fresca disponible." />
          <View style={styles.servingNotice}><Text style={styles.servingNoticeText}>La ración debe adaptarse a la edad, el peso, la actividad y la condición corporal de cada perro.</Text></View>
        </ScrollView>

        <View style={styles.modalActions}>
          <PrimaryButton label="Continuar con la alimentación recomendada" onPress={onContinue} />
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.modalCloseAction}>
            <Text style={styles.modalCloseActionText}>Cerrar</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function ModalSection({ body, title }: { body: string; title: string }) {
  return <View style={styles.modalSection}><Text style={styles.modalSectionTitle}>{title}</Text><Text style={styles.modalSectionBody}>{body}</Text></View>;
}

function ModalList({ items, title }: { items: string[]; title: string }) {
  return <View style={styles.modalSection}><Text style={styles.modalSectionTitle}>{title}</Text><View style={styles.modalList}>{items.map((item) => <View key={item} style={styles.modalListItem}><View style={styles.modalListMark} /><Text style={styles.modalSectionBody}>{item}</Text></View>)}</View></View>;
}

function InsuranceCard({ onPress }: { onPress: () => void }) {
  return (
    <View style={styles.commercialSection}>
      <View style={styles.commercialHeading}>
        <Text style={styles.eyebrow}>SEGURO RECOMENDADO</Text>
        <Text style={styles.sectionTitle}>Cuidar sin imprevistos</Text>
      </View>
      <View style={styles.insuranceCard}>
        <Image
          accessibilityLabel="Promoción oficial Santévet: 50 euros extra para prevención con el código MEDPREV50ES"
          resizeMode="contain"
          source={require('../../../assets/Santevet/ES - MEDPREV50ES (1).png')}
          style={styles.insuranceBanner}
        />
        <View style={styles.insuranceContent}>
          <View style={styles.insuranceTop}>
          <Text style={styles.recommendedBadge}>RECOMENDADO</Text>
          </View>
          <Text style={styles.insuranceName}>Santévet</Text>
          <Text style={styles.insuranceBody}>Un seguro veterinario para proteger la salud de tu cachorro y ayudarte con los gastos veterinarios a lo largo de su vida.</Text>
          <View style={styles.promoBox}>
            <Text style={styles.promoLabel}>BENEFICIO PROMOCIONAL</Text>
            <Text style={styles.promoValue}>Condiciones especiales para familias del criadero</Text>
            <Text style={styles.promoCode}>Código promocional: consultar</Text>
          </View>
          <PrimaryButton label="Ver seguro recomendado" onPress={onPress} light />
        </View>
      </View>
    </View>
  );
}

function ContactCard() {
  return (
    <View style={styles.commercialSection}>
      <View style={styles.commercialHeading}>
        <Text style={styles.eyebrow}>CONTACTO</Text>
        <Text style={styles.sectionTitle}>Marlenne sigue cerca</Text>
      </View>
      <View style={styles.contactCard}>
        <View style={styles.contactAvatar}><Text style={styles.contactInitial}>M</Text></View>
        <View style={styles.contactCopy}>
          <Text style={styles.cardTitle}>{BREEDER_NAME}</Text>
          <Text style={styles.cardBody}>Tu criadora sigue disponible para ayudarte durante el crecimiento de tu cachorro.</Text>
        </View>
        <Text style={styles.contactArrow}>→</Text>
      </View>
    </View>
  );
}

function PrimaryButton({ label, light = false, onPress }: { label: string; light?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.primaryButton, light && styles.primaryButtonLight, pressed && styles.cardPressed]}>
      <Text style={[styles.primaryButtonText, light && styles.primaryButtonTextLight]}>{label}</Text>
      <Text style={[styles.primaryButtonArrow, light && styles.primaryButtonTextLight]}>→</Text>
    </Pressable>
  );
}

function OwnerHealthSection({ kennelId, puppy }: { kennelId: string | null; puppy: Puppy }) {
  const query = usePuppyHealthEvents(kennelId, puppy.id);
  const events = query.data ?? [];

  if (query.isLoading || query.error || events.length === 0) return null;

  return (
    <View style={styles.healthSection}>
      <Text style={styles.eyebrow}>SALUD</Text>
      <Text style={styles.sectionTitle}>Su historia, al día</Text>
      <View style={styles.timeline}>
        {events.map((event, index) => <HealthEventItem event={event} key={event.id} last={index === events.length - 1} />)}
      </View>
    </View>
  );
}

function HealthEventItem({ event, last }: { event: HealthEvent; last: boolean }) {
  return (
    <View style={styles.event}>
      <View style={styles.eventRail}>
        <View style={styles.eventDot} />
        {!last ? <View style={styles.eventLine} /> : null}
      </View>
      <View style={styles.eventContent}>
        <Text style={styles.eventMeta}>{getHealthEventTypeLabel(event.event_type).toUpperCase()} · {formatIsoDate(event.event_date)}</Text>
        <Text style={styles.eventTitle}>{event.title}</Text>
        {event.notes ? <Text style={styles.eventNotes}>{event.notes}</Text> : null}
      </View>
    </View>
  );
}

function getBreedLabel(litter: Litter | null, dogsById: Map<string, Dog>) {
  const motherBreed = litter?.mother_id ? dogsById.get(litter.mother_id)?.breed : null;
  const fatherBreed = litter?.father_id ? dogsById.get(litter.father_id)?.breed : null;
  if (motherBreed && fatherBreed && motherBreed !== fatherBreed) return `${motherBreed} / ${fatherBreed}`;
  return motherBreed || fatherBreed || 'Raza no registrada';
}

function formatIsoDate(value: string) {
  const [year, month, day] = value.split('-');
  return year && month && day ? `${day}.${month}.${year}` : value;
}

function formatIdentifier(id: string) {
  return `SG-${id.replace(/-/g, '').slice(-5).toUpperCase()}`;
}

const softShadow = Platform.select({
  ios: { shadowColor: '#3A312B', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.06, shadowRadius: 25 },
  android: { elevation: 2 },
  default: { boxShadow: '0 12px 35px rgba(58, 49, 43, 0.06)' },
}) as object;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F7F5F1' },
  page: { width: '100%', maxWidth: 960, minWidth: 0, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 48, gap: 14 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: '#F7F5F1' },
  errorTitle: { fontSize: 22, fontWeight: '600', color: '#211F1C', textAlign: 'center' },
  errorBody: { marginTop: 8, fontSize: 15, color: '#77716A', textAlign: 'center' },
  brandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, marginBottom: 4 },
  brand: { flex: 1, fontSize: 15, fontWeight: '600', letterSpacing: -0.2, color: '#292622' },
  privateLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1.5, color: '#918A82' },
  photoFrame: { height: 480, maxHeight: Platform.OS === 'web' ? 620 : 480, overflow: 'hidden', borderRadius: 30, backgroundColor: '#D9D3CA' },
  photo: { width: '100%', height: '100%' },
  photoFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#DDD6CC' },
  photoInitial: { fontSize: 112, fontWeight: '300', color: '#F7F4EF' },
  photoShade: { ...StyleSheet.absoluteFillObject, top: '42%', backgroundColor: 'rgba(19, 16, 13, 0.22)' },
  photoCaption: { position: 'absolute', left: 24, right: 24, bottom: 23 },
  heroName: { fontSize: 44, lineHeight: 48, fontWeight: '600', letterSpacing: -1.7, color: '#FFFFFF' },
  identifier: { marginTop: 5, fontSize: 11, fontWeight: '700', letterSpacing: 2, color: 'rgba(255,255,255,0.76)' },
  facts: { flexDirection: 'row', alignItems: 'stretch', marginTop: 12, paddingVertical: 17, paddingHorizontal: 6, backgroundColor: '#FFFFFF', borderRadius: 22, ...softShadow },
  fact: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 7 },
  factDivider: { width: StyleSheet.hairlineWidth, backgroundColor: '#E8E3DC' },
  factLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1, color: '#A09991', textTransform: 'uppercase' },
  factValue: { marginTop: 5, fontSize: 12, lineHeight: 16, fontWeight: '600', color: '#322E2A', textAlign: 'center' },
  intro: { paddingHorizontal: 6, paddingTop: 44, paddingBottom: 12 },
  eyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.7, color: '#9A7765' },
  sectionTitle: { marginTop: 9, fontSize: 29, lineHeight: 34, fontWeight: '600', letterSpacing: -0.8, color: '#25211E' },
  sectionLead: { marginTop: 10, maxWidth: 430, fontSize: 15, lineHeight: 23, color: '#77716A' },
  commercialSection: { width: '100%', minWidth: 0, alignSelf: 'stretch', paddingTop: 38 },
  commercialHeading: { minWidth: 0, paddingBottom: 19 },
  productCard: { width: '100%', maxWidth: 960, minWidth: 0, alignSelf: 'center', overflow: 'hidden', borderRadius: 30, backgroundColor: '#FFFFFF', ...softShadow },
  panelsContainer: { width: '100%', minWidth: 0, alignSelf: 'stretch', gap: 8 },
  foodActions: { width: '100%', minWidth: 0, paddingHorizontal: 14, paddingBottom: 14 },
  secondaryButton: { width: '100%', minWidth: 0, minHeight: 48, marginTop: 6, alignItems: 'center', justifyContent: 'center' },
  secondaryButtonText: { fontSize: 14, fontWeight: '700', color: '#4B4039' },
  primaryButton: { width: '100%', minWidth: 0, minHeight: 56, marginTop: 25, paddingHorizontal: 19, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 17, backgroundColor: '#2D2824' },
  primaryButtonLight: { backgroundColor: '#FFFFFF' },
  primaryButtonText: { minWidth: 0, flexShrink: 1, fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  primaryButtonTextLight: { color: '#3B2B24' },
  primaryButtonArrow: { flexShrink: 0, marginLeft: 8, fontSize: 18, color: '#FFFFFF' },
  modalSafeArea: { flex: 1, backgroundColor: '#F7F5F1' },
  modalHeader: { width: '100%', maxWidth: 900, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  modalEyebrow: { fontSize: 9, fontWeight: '700', letterSpacing: 1.5, color: '#9A7765' },
  modalTitle: { marginTop: 4, fontSize: 24, lineHeight: 29, fontWeight: '600', color: '#28231F' },
  closeButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 21, backgroundColor: '#ECE7E1' },
  closeButtonText: { marginTop: -2, fontSize: 28, lineHeight: 30, fontWeight: '300', color: '#443B35' },
  modalContent: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 12, gap: 12 },
  modalSection: { padding: 20, borderRadius: 20, backgroundColor: '#FFFFFF' },
  modalSectionTitle: { fontSize: 17, fontWeight: '700', color: '#302A26' },
  modalSectionBody: { flex: 1, marginTop: 7, fontSize: 14, lineHeight: 21, color: '#706962' },
  modalList: { marginTop: 6, gap: 5 },
  modalListItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  modalListMark: { width: 6, height: 6, marginTop: 14, borderRadius: 3, backgroundColor: '#9A7765' },
  servingNotice: { padding: 18, borderWidth: 1, borderColor: '#D9C9BE', borderRadius: 18, backgroundColor: '#F1E9E3' },
  servingNoticeText: { fontSize: 13, lineHeight: 20, fontWeight: '600', color: '#5B4E46' },
  modalActions: { width: '100%', maxWidth: 900, alignSelf: 'center', paddingHorizontal: 20, paddingBottom: 16 },
  modalCloseAction: { minHeight: 45, alignItems: 'center', justifyContent: 'center' },
  modalCloseActionText: { fontSize: 14, fontWeight: '700', color: '#6F625A' },
  insuranceCard: { width: '100%', maxWidth: 960, minWidth: 0, alignSelf: 'center', overflow: 'hidden', borderRadius: 30, backgroundColor: '#6F4E40', ...softShadow },
  insuranceBanner: { width: '100%', maxWidth: '100%', minWidth: 0, alignSelf: 'stretch', aspectRatio: 671 / 171, backgroundColor: '#E2F2ED' },
  insuranceContent: { width: '100%', minWidth: 0, padding: 25 },
  insuranceTop: { minWidth: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  recommendedBadge: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: 99, overflow: 'hidden', fontSize: 8, fontWeight: '800', letterSpacing: 1.2, color: '#F6EDE7', backgroundColor: 'rgba(255,255,255,0.11)' },
  insuranceName: { marginTop: 29, fontSize: 31, lineHeight: 36, fontWeight: '600', letterSpacing: -0.8, color: '#FFFFFF' },
  insuranceBody: { marginTop: 10, fontSize: 14, lineHeight: 22, color: '#E9DDD6' },
  promoBox: { marginTop: 23, padding: 17, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.09)' },
  promoLabel: { fontSize: 8, fontWeight: '800', letterSpacing: 1.3, color: '#DBCBC3' },
  promoValue: { marginTop: 7, fontSize: 15, lineHeight: 20, fontWeight: '600', color: '#FFFFFF' },
  promoCode: { marginTop: 10, fontSize: 11, color: '#E7DAD3' },
  contactCard: { minHeight: 145, flexDirection: 'row', alignItems: 'center', gap: 16, padding: 22, borderRadius: 28, backgroundColor: '#FFFFFF', ...softShadow },
  contactAvatar: { width: 54, height: 54, alignItems: 'center', justifyContent: 'center', borderRadius: 27, backgroundColor: '#E9DDD5' },
  contactInitial: { fontSize: 20, fontWeight: '600', color: '#745747' },
  contactCopy: { flex: 1 },
  contactArrow: { fontSize: 20, color: '#9A9189' },
  card: { minHeight: 250, padding: 24, borderRadius: 28, backgroundColor: '#FFFFFF', ...softShadow },
  cardPressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 27 },
  iconCircle: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1ECE6' },
  icon: { fontSize: 21, fontWeight: '400', color: '#7F6254' },
  cardArrow: { fontSize: 18, color: '#AAA39C' },
  cardKicker: { fontSize: 9, fontWeight: '700', letterSpacing: 1.6, color: '#A09991' },
  cardTitle: { marginTop: 8, fontSize: 24, lineHeight: 29, fontWeight: '600', letterSpacing: -0.5, color: '#28241F' },
  cardBody: { marginTop: 9, fontSize: 14, lineHeight: 21, color: '#7B746D' },
  cardAction: { marginTop: 24, fontSize: 13, fontWeight: '700', color: '#6F5143' },
  healthSection: { paddingHorizontal: 6, paddingTop: 46, paddingBottom: 12 },
  timeline: { marginTop: 25 },
  event: { flexDirection: 'row', minHeight: 90 },
  eventRail: { width: 24, alignItems: 'center' },
  eventDot: { width: 9, height: 9, borderRadius: 5, marginTop: 5, backgroundColor: '#9A7765' },
  eventLine: { width: StyleSheet.hairlineWidth, flex: 1, marginVertical: 5, backgroundColor: '#D8D1C9' },
  eventContent: { flex: 1, paddingLeft: 11, paddingBottom: 27 },
  eventMeta: { fontSize: 9, fontWeight: '700', letterSpacing: 1, color: '#A09991' },
  eventTitle: { marginTop: 6, fontSize: 17, fontWeight: '600', color: '#302B27' },
  eventNotes: { marginTop: 5, fontSize: 13, lineHeight: 19, color: '#7B746D' },
  footer: { alignItems: 'center', paddingTop: 56, paddingBottom: 10 },
  footerMark: { fontSize: 15, fontWeight: '700', letterSpacing: -0.2, color: '#3C3631' },
  footerText: { marginTop: 5, fontSize: 11, color: '#9B948C' },
});
