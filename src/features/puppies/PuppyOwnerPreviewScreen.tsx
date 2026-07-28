import { Link, router, type Href } from 'expo-router';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
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
  useWindowDimensions,
  View,
} from 'react-native';

import { EmptyState, LoadingState, ProductDetailsModal, type ProductDetailSection } from '../../components';
import { ProtectedRoute } from '../auth';
import { useDogs, type Dog } from '../dogs';
import { getHealthEventTypeLabel, usePuppyHealthEvents, type HealthEvent } from '../health';
import { useCurrentKennel } from '../kennels';
import { useLitters, type Litter } from '../litters';
import { EditablePuppyHero } from '../puppyPhoto';
import { PwaInstallCallToAction } from '../pwa';
import type { PublicOwnerBranding } from './publicOwnerBranding';
import { getPuppySexLabel, type Puppy } from './types';
import { usePuppies } from './usePuppies';

export const FOOD_CHECKOUT_URL = 'https://www.sgservice.es/cart/?add-to-cart=23';
// TODO: Replace with the direct external Santévet landing URL when it is available.
const SANTEVET_URL = 'https://www.santevet.es/';
const MDR1_INFORMATION_URL = 'https://vgl.ucdavis.edu/test/multidrug-sensitivity-mdr1';
const BREEDER_NAME = 'Isidro';
const SERVING_AGES = ['2 meses', '3 meses', '4 meses', '6 meses', '8 meses', '10 meses', '12 meses'];
const SERVING_ROWS = [
  { weight: '8 kg', servings: ['100 g', '130 g', '160 g', '190 g', '180 g', '160 g', '180 g'] },
  { weight: '10 kg', servings: ['110 g', '140 g', '180 g', '230 g', '220 g', '190 g', '220 g'] },
  { weight: '15 kg', servings: ['140 g', '180 g', '220 g', '270 g', '260 g', '230 g', '260 g'] },
  { weight: '20 kg', servings: ['240 g', '270 g', '260 g', '300 g', '300 g', '260 g', '320 g'] },
  { weight: '30 kg', servings: ['270 g', '315 g', '385 g', '420 g', '380 g', '385 g', '410 g'] },
  { weight: '40 kg', servings: ['350 g', '400 g', '450 g', '480 g', '500 g', '510 g', '550 g'] },
];

const FOOD_DETAIL_SECTIONS: ProductDetailSection[] = [
  {
    title: 'Composición',
    body: 'Pollo 48% (pollo fresco 20%*, pollo deshidratado 28%), arroz 22%*, guisantes pelados*, almidón de guisante, aceite de pollo, proteína hidrolizada de pollo, pulpa de remolacha, hígado de pollo hidrolizado, sustancias minerales, fibra vegetal, verduras y frutas frescas 4% (judías verdes*, patatas*, mango* y manzana*), protectores articulares (condroitina sulfato, glucosamina sulfato y MSM, componentes de cartílago articular), yuca, raíz de achicoria (fuente de inulina-FOS), levaduras (MOS), orégano, romero, tomillo, melisa, valeriana y antioxidantes naturales (tocoferoles*).',
    note: '* Ingredientes naturales.',
  },
  {
    title: 'Componentes analíticos',
    items: [
      'Proteína bruta: 30%',
      'Grasa bruta: 14%',
      'Fibra bruta: 2,3%',
      'Materia inorgánica: 5,9%',
      'Vitamina A: 22.000 U.I./kg',
      'Vitamina D3: 2.200 U.I./kg',
      'Vitamina E, α-tocoferol: 110 mg/kg',
      'Calcio: 1,2%',
      'Fósforo: 0,9%',
      'Sodio: 0,12%',
      'Potasio: 0,24%',
      'Energía metabolizable: 3.633 kcal/kg',
    ],
  },
  {
    title: 'Aditivos',
    groups: [
      {
        title: 'Aditivos nutricionales por kilogramo',
        items: ['Condroitina sulfato: 500 mg', 'Glucosamina sulfato: 500 mg'],
      },
      {
        title: 'Oligoelementos',
        items: [
          'Hierro: 215 mg, como carbonato ferroso',
          'Yodo: 2,2 mg, como yoduro potásico',
          'Cobre: 16 mg, como sulfato de cobre II pentahidratado',
          'Manganeso: 45 mg, como óxido manganoso',
          'Zinc: 210 mg, como óxido de zinc',
          'Selenio: 0,34 mg, como selenito sódico',
        ],
      },
      {
        title: 'Aditivos tecnológicos',
        body: 'Conservantes y antioxidantes, incluyendo tocoferoles naturales.',
      },
    ],
  },
  {
    title: 'Detalles del producto',
    items: [
      'Peso: 12 kg',
      'Edad: cachorro',
      'Tipo de alimento: alimento seco',
      'Tamaño: medium y todos los tamaños',
      'Mascota: perro',
      'Referencia: 1007041',
      'EAN: 8424160024812',
    ],
    groups: [
      {
        title: 'Función nutricional',
        items: ['Bajo en cereales', 'Carne fresca', 'Monoproteico', 'Natural', 'Sin gluten'],
      },
      {
        title: 'Cuidado especial',
        items: ['Articulaciones', 'Fácil digestión', 'Hipoalergénico'],
      },
    ],
  },
  {
    title: 'Ingredientes destacados',
    chips: ['Pollo', 'Arroz', 'Patatas', 'Manzana', 'Plantas prebióticas', 'Mango', 'Judías verdes'],
  },
];

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
  publicBranding?: PublicOwnerBranding;
  showHealth?: boolean;
  allowOwnerPhotoEditing?: boolean;
  showPrivateLabel?: boolean;
  showPwaInstall?: boolean;
}

/** Shared presentation for the authenticated preview and the public web route. */
export function PuppyOwnerExperience({ allowOwnerPhotoEditing = false, brandName = 'AmiDog', breed, healthKennelId = null, publicBranding, puppy, showHealth = false, showPrivateLabel = false, showPwaInstall = false }: PuppyOwnerExperienceProps) {
  const [foodInfoVisible, setFoodInfoVisible] = useState(false);

  const handleOpenExternalUrl = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('No se ha podido abrir el enlace', 'Inténtalo de nuevo en unos segundos.');
    }
  };

  const handleOpenFoodCheckout = () => handleOpenExternalUrl(FOOD_CHECKOUT_URL);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.page}>
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <Text style={styles.brand}>{brandName}</Text>
            {showPrivateLabel ? <Text style={styles.privateLabel}>ESPACIO PRIVADO</Text> : null}
          </View>

          {allowOwnerPhotoEditing ? (
            <EditablePuppyHero initialUri={puppy.photo_url} petName={puppy.name || 'tu cachorro'} puppyId={puppy.id}>
              {(photoUri, controls) => <Hero breed={breed} controls={controls} photoUri={photoUri} puppy={puppy} />}
            </EditablePuppyHero>
          ) : (
            <Hero puppy={puppy} breed={breed} />
          )}
        </View>

        {showPwaInstall ? <PwaInstallCallToAction petName={puppy.name || 'tu cachorro'} /> : null}

        <FoodRecommendationCard
          onContinue={handleOpenFoodCheckout}
          onMoreInformation={() => setFoodInfoVisible(true)}
          publicLayout={Boolean(publicBranding)}
        />
        <InsuranceCard />
        <ContactCard petName={puppy.name || 'tu cachorro'} publicBranding={publicBranding} />

        {showHealth ? <OwnerHealthSection kennelId={healthKennelId} puppy={puppy} /> : null}

        {publicBranding ? (
          <SgServiceBrandFooter publicBranding={publicBranding} />
        ) : (
          <View style={styles.footer}>
            <Text style={styles.footerMark}>AmiDog</Text>
            <Text style={styles.footerText}>El espacio personal de {puppy.name}</Text>
          </View>
        )}
      </ScrollView>
      <FoodInformationModal
        visible={foodInfoVisible}
        onClose={() => setFoodInfoVisible(false)}
        onContinue={handleOpenFoodCheckout}
      />
    </SafeAreaView>
  );
}

function Hero({ breed, controls = null, photoUri = null, puppy }: { breed: string; controls?: ReactNode; photoUri?: string | null; puppy: Puppy }) {
  const resolvedPhotoUri = photoUri ?? puppy.photo_url;

  return (
    <View>
      <View style={styles.heroIdentity}>
        <View style={styles.heroCopy}>
          <Text style={styles.heroName}>{puppy.name || 'Cachorro sin nombre'}</Text>
          <Text style={styles.identifier}>{formatIdentifier(puppy.id)}</Text>
        </View>

        <View style={styles.avatarShell}>
          <View style={styles.avatarFrame}>
            {resolvedPhotoUri ? (
              <Image source={{ uri: resolvedPhotoUri }} resizeMode="cover" style={styles.photo} />
            ) : (
              <View style={styles.photoFallback}>
                <Text style={styles.photoInitial}>{(puppy.name || '?').slice(0, 1).toUpperCase()}</Text>
              </View>
            )}
            <View pointerEvents="none" style={styles.avatarRing} />
          </View>
          {controls}
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
  publicLayout = false,
}: {
  onContinue: () => void;
  onMoreInformation: () => void;
  publicLayout?: boolean;
}) {
  const [panelsWidth, setPanelsWidth] = useState(0);
  const { width: viewportWidth } = useWindowDimensions();
  const isMobilePublicLayout = publicLayout && viewportWidth <= 480;
  const gap = 8;
  const panelsInRow = panelsWidth >= 768;
  const panelWidth = panelsInRow ? (panelsWidth - gap) / 2 : panelsWidth;
  const panelHeight = panelWidth * (1024 / 768);

  return (
    <View style={styles.commercialSection}>
      <View style={styles.commercialHeading}>
        <Text style={[styles.sectionTitle, isMobilePublicLayout && styles.foodSectionTitleMobile]}>Alimentación recomendada</Text>
      </View>

      <View style={styles.productCard}>
        {publicLayout ? (
          <View style={styles.publicFoodContent}>
            <View style={[styles.publicProductIntro, isMobilePublicLayout && styles.publicProductIntroMobile]}>
              <View style={styles.publicProductCopy}>
                <Text style={styles.foodEyebrow}>DIBAQ SENSE</Text>
                <Text style={styles.foodProductTitle}>Puppy Mini Chicken</Text>
                <Text style={styles.foodProductBody}>Receta hipoalergénica con pollo, arroz, frutas, verduras y prebióticos naturales.</Text>
              </View>
              <Link
                accessibilityHint="Abre la página de compra del alimento"
                accessibilityLabel="Comprar saco de Dibaq Sense Puppy"
                href={FOOD_CHECKOUT_URL as Href}
                rel="noopener noreferrer"
                style={[styles.foodBagCrop, isMobilePublicLayout && styles.foodBagCropMobile]}
                target="_blank"
              >
                <Image
                  resizeMode="contain"
                  source={require('../../../assets/Dibaq/Dibaq Sense.png')}
                  style={styles.foodBagImage}
                />
              </Link>
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={onMoreInformation}
              style={({ pressed }) => [styles.productDetailsButton, pressed && styles.cardPressed]}
            >
              <Text style={styles.productDetailsButtonText}>Ver composición e información nutricional</Text>
              <Text style={styles.productDetailsButtonArrow}>→</Text>
            </Pressable>

            <View style={styles.welcomeGift}>
              <View style={styles.giftCopy}>
                <Text style={styles.giftTitle}>🎁 Además, te regalamos 4 latas de comida húmeda para cuidar su digestión y su flora intestinal 🐶. Mézclala con su pienso o prepárale un menú especial una vez por semana.</Text>
              </View>
            </View>
            <Link
              accessibilityHint="Abre la misma página de compra que el botón de alimentación"
              accessibilityLabel="Comprar alimento con pack de regalo de cuatro latas Dibaq Natural Moments"
              href={FOOD_CHECKOUT_URL as Href}
              rel="noopener noreferrer"
              style={styles.giftPackLink}
              target="_blank"
            >
              <Image
                resizeMode="contain"
                source={require('../../../assets/Dibaq/Dibaq Natural Moments pack regalo recortado.png')}
                style={styles.giftPackImage}
              />
            </Link>

            <PrimaryButton label="🛒 Comprar este alimento" onPress={onContinue} />
            <ServingTable />
          </View>
        ) : (
          <>
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
            <Text style={styles.secondaryButtonText}>Ver composición e información nutricional</Text>
          </Pressable>
        </View>
          </>
        )}
      </View>
    </View>
  );
}

function ServingTable() {
  return (
    <View style={styles.servingTableSection}>
      <Text style={styles.foodSubheading}>Ración diaria recomendada</Text>
      <Text style={styles.servingTableHint}>Según el peso adulto estimado y la edad del cachorro.</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.servingTableScroll}>
        <View style={styles.servingTable}>
          <View style={[styles.servingTableRow, styles.servingTableHeaderRow]}>
            <Text style={[styles.servingTableCell, styles.servingWeightCell, styles.servingTableHeader]}>Peso adulto</Text>
            {SERVING_AGES.map((age) => <Text key={age} style={[styles.servingTableCell, styles.servingTableHeader]}>{age}</Text>)}
          </View>
          {SERVING_ROWS.map((row) => (
            <View key={row.weight} style={styles.servingTableRow}>
              <Text style={[styles.servingTableCell, styles.servingWeightCell, styles.servingTableWeight]}>{row.weight}</Text>
              {row.servings.map((serving, index) => <Text key={`${row.weight}-${SERVING_AGES[index]}`} style={styles.servingTableCell}>{serving}</Text>)}
            </View>
          ))}
        </View>
      </ScrollView>
      <Text style={styles.servingFootnote}>Ajusta la ración a la actividad y condición corporal. Mantén siempre agua fresca disponible.</Text>
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
    <ProductDetailsModal
      eyebrow="DIBAQ SENSE · PUPPY MINI CHICKEN"
      footer={
        <View style={styles.productModalPurchase}>
          <PrimaryButton label="Continuar con la alimentación recomendada" onPress={onContinue} />
        </View>
      }
      onClose={onClose}
      sections={FOOD_DETAIL_SECTIONS}
      title="Composición e información nutricional"
      visible={visible}
    />
  );
}

function InsuranceCard() {
  return (
    <View style={styles.commercialSection}>
      <View style={styles.commercialHeading}>
        <View style={styles.insuranceHeadingRow}>
          <Text style={styles.insuranceQuestion}>¿SEGURO DE SALUD VETERINARIO?</Text>
          <Text style={styles.insuranceRecommended}>RECOMENDADO</Text>
        </View>
        <Text style={styles.sectionTitle}>Cuidar sin imprevistos</Text>
      </View>
      <View style={styles.insuranceCard}>
        <View style={styles.insuranceContent}>
          <Text style={styles.insuranceInfoTitle}>Más que protección ante imprevistos</Text>
          <Text style={styles.insuranceBody}>Un buen seguro veterinario también puede ayudarte a cuidar la salud de tu cachorro desde el principio. Algunas pólizas incluyen un presupuesto para prevención que puede utilizarse en vacunas, desparasitaciones, análisis de ADN y otros cuidados preventivos.</Text>
          <Text style={styles.insuranceBody}>Estas pruebas genéticas pueden aportar información especialmente útil en determinadas razas. Por ejemplo, algunos perros pastores pueden presentar sensibilidad genética a ciertos medicamentos.</Text>
          <Link
            accessibilityLabel="Información sobre la sensibilidad MDR1"
            href={MDR1_INFORMATION_URL as Href}
            rel="noopener noreferrer"
            style={styles.insuranceInfoLink}
            target="_blank"
          >
            ¿Qué es la sensibilidad MDR1? ↗
          </Link>
          <Text style={styles.insuranceBody}>También conviene valorar una cobertura veterinaria real en todo el territorio nacional y servicios que eviten adelantar el importe completo de la factura, abonando únicamente la parte que corresponda según las condiciones de la póliza.</Text>
        </View>
      </View>
      <Link asChild href={SANTEVET_URL as Href} rel="noopener noreferrer" target="_blank">
        <Pressable
          accessibilityHint="Abre la página comercial de Santévet"
          accessibilityLabel="Promoción oficial Santévet: 50 euros extra para prevención con el código MEDPREV50ES"
          accessibilityRole="link"
          style={({ pressed }) => [styles.insuranceBannerLink, pressed && styles.cardPressed]}
        >
          <Image
            resizeMode="contain"
            source={require('../../../assets/Santevet/ES - MEDPREV50ES (1).png')}
            style={styles.insuranceBanner}
          />
        </Pressable>
      </Link>
    </View>
  );
}

type ContactAction = { label: string; symbol: string; url: string };

function ContactCard({ petName, publicBranding }: { petName: string; publicBranding?: PublicOwnerBranding }) {
  const [contactMenuVisible, setContactMenuVisible] = useState(false);
  const [contactActions, setContactActions] = useState<ContactAction[]>([]);

  useEffect(() => {
    if (!publicBranding) return;

    let active = true;
    const phoneNumber = publicBranding.contact.phoneHref.replace(/^tel:/, '');
    const candidates: ContactAction[] = [
      { label: 'Llamar', symbol: '📞', url: publicBranding.contact.phoneHref },
      { label: 'WhatsApp', symbol: '💬', url: `https://wa.me/${phoneNumber.replace(/\D/g, '')}` },
      { label: 'Mensaje', symbol: '✉️', url: `sms:${phoneNumber}` },
    ];

    void Promise.all(candidates.map(async (action) => {
      try {
        return (await Linking.canOpenURL(action.url)) ? action : null;
      } catch {
        return null;
      }
    })).then((availableActions) => {
      if (active) setContactActions(availableActions.filter((action): action is ContactAction => Boolean(action)));
    });

    return () => { active = false; };
  }, [publicBranding]);

  const handleContactAction = async (action: ContactAction) => {
    setContactMenuVisible(false);
    try {
      await Linking.openURL(action.url);
    } catch {
      // Some desktop browsers report support for device-only protocols. Close quietly.
    }
  };

  if (publicBranding) {
    const { contact } = publicBranding;

    return (
      <View style={styles.commercialSection}>
        <View style={styles.commercialHeading}>
          <Text style={styles.eyebrow}>CONTACTO</Text>
          <Text style={styles.sectionTitle}>¿Necesitas ayuda con {petName}?</Text>
        </View>
        <View style={styles.contactCard}>
          <View style={styles.contactAvatar}><Text style={styles.contactInitial}>{contact.name.slice(0, 1)}</Text></View>
          <View style={styles.contactCopy}>
            <Text style={styles.cardTitle}>{contact.name}</Text>
            <Text style={styles.contactRole}>{contact.role}</Text>
            <View style={styles.contactActions}>
              <Pressable
                accessibilityLabel={`Contactar con ${contact.name} en el ${contact.phone}`}
                accessibilityRole="button"
                onPress={() => setContactMenuVisible(true)}
                style={({ pressed }) => [styles.primaryContactButton, pressed && styles.cardPressed]}
              >
                <Text style={styles.primaryContactButtonText}>Contactar con {contact.name}</Text>
                <Text style={styles.primaryContactButtonArrow}>›</Text>
              </Pressable>
              <Pressable
                accessibilityLabel={`Abrir opciones de contacto para el ${contact.phone}`}
                accessibilityRole="button"
                onPress={() => setContactMenuVisible(true)}
                style={styles.contactDetail}
              >
                <Text style={styles.contactActionLabel}>Teléfono</Text>
                <Text style={styles.contactActionValue}>{contact.phone}</Text>
              </Pressable>
              <Link asChild href={contact.emailHref as Href}>
                <Pressable
                  accessibilityLabel={`Escribir a ${contact.email}`}
                  accessibilityRole="link"
                  style={styles.contactAction}
                >
                  <Text style={styles.contactActionLabel}>Correo</Text>
                  <Text style={styles.contactActionValue}>{contact.email}</Text>
                </Pressable>
              </Link>
            </View>
          </View>
        </View>
        <Modal animationType="none" onRequestClose={() => setContactMenuVisible(false)} transparent visible={contactMenuVisible}>
          <View style={styles.actionSheetLayer}>
            <Pressable accessibilityLabel="Cerrar opciones de contacto" onPress={() => setContactMenuVisible(false)} style={styles.actionSheetBackdrop} />
            <View accessibilityRole="menu" style={styles.actionSheet}>
              <View style={styles.actionSheetHandle} />
              <Text style={styles.actionSheetTitle}>Contactar con {contact.name}</Text>
              {contactActions.map((action) => (
                <Pressable
                  accessibilityRole="menuitem"
                  key={action.label}
                  onPress={() => handleContactAction(action)}
                  style={({ pressed }) => [styles.actionSheetAction, pressed && styles.actionSheetActionPressed]}
                >
                  <Text style={styles.actionSheetSymbol}>{action.symbol}</Text>
                  <Text style={styles.actionSheetActionLabel}>{action.label}</Text>
                </Pressable>
              ))}
              <Pressable onPress={() => setContactMenuVisible(false)} style={styles.actionSheetCancel}>
                <Text style={styles.actionSheetCancelText}>Cancelar</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

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

function SgServiceBrandFooter({ publicBranding }: { publicBranding: PublicOwnerBranding }) {
  return (
    <View style={styles.sgServiceFooter}>
      <Link
        accessibilityLabel="Visitar SGService"
        href={publicBranding.sgService.url as Href}
        rel="noopener noreferrer"
        style={styles.sgServiceAnchor}
        target="_blank"
      >
        <View style={styles.sgServiceLink}>
          <Text style={styles.sgServiceText}>AmiDog, una experiencia de SGService</Text>
          <Image
            accessibilityLabel="Logotipo azul de SGService"
            resizeMode="contain"
            source={publicBranding.sgService.logo}
            style={styles.sgServiceLogo}
          />
        </View>
      </Link>
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
  header: { width: '100%', padding: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: '#E9E3DC', borderRadius: 26, backgroundColor: '#FFFFFF', ...softShadow },
  brandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { flex: 1, fontSize: 15, fontWeight: '600', letterSpacing: -0.2, color: '#292622' },
  privateLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1.5, color: '#918A82' },
  heroIdentity: { minHeight: 98, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16, paddingTop: 5, paddingBottom: 7 },
  heroCopy: { flex: 1, minWidth: 0, paddingLeft: 4 },
  avatarShell: { width: 84, height: 84, flexShrink: 0 },
  avatarFrame: { width: 84, height: 84, overflow: 'hidden', borderRadius: 42, backgroundColor: '#D9D3CA', ...softShadow },
  photo: { width: '100%', height: '100%' },
  photoFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#DDD6CC' },
  photoInitial: { fontSize: 35, fontWeight: '300', color: '#F7F4EF' },
  avatarRing: { ...StyleSheet.absoluteFillObject, borderWidth: 3, borderColor: '#FFFFFF', borderRadius: 42 },
  heroName: { fontSize: 36, lineHeight: 40, fontWeight: '600', letterSpacing: -1.3, color: '#25211E' },
  identifier: { marginTop: 6, fontSize: 9, fontWeight: '700', letterSpacing: 1.6, color: '#9A9189' },
  facts: { flexDirection: 'row', alignItems: 'stretch', paddingVertical: 11, paddingHorizontal: 2, backgroundColor: '#F7F5F1', borderRadius: 16 },
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
  publicFoodContent: { width: '100%', minWidth: 0, padding: 20 },
  foodSectionTitleMobile: { fontSize: 27, lineHeight: 32 },
  publicProductIntro: { minWidth: 0, flexDirection: 'row-reverse', alignItems: 'center', gap: 20 },
  publicProductIntroMobile: { flexDirection: 'column', alignItems: 'stretch', gap: 0 },
  foodBagCrop: { width: 180, maxWidth: '100%', aspectRatio: 7 / 8, flexShrink: 0, alignSelf: 'center', overflow: 'hidden', borderRadius: 20, backgroundColor: '#FAF8F5' },
  foodBagCropMobile: { width: '100%', maxWidth: 280, marginTop: 16 },
  foodBagImage: { width: '100%', height: '100%', transform: [{ scale: 3.1 }] },
  publicProductCopy: { flex: 1, minWidth: 0 },
  foodEyebrow: { fontSize: 9, fontWeight: '800', letterSpacing: 1.4, color: '#9A7765' },
  foodProductTitle: { marginTop: 7, fontSize: 23, lineHeight: 28, fontWeight: '700', letterSpacing: -0.5, color: '#28241F' },
  foodProductBody: { marginTop: 8, fontSize: 13, lineHeight: 20, color: '#706962' },
  foodSubheading: { fontSize: 17, lineHeight: 22, fontWeight: '700', color: '#302A26' },
  productDetailsButton: { width: '100%', minWidth: 0, minHeight: 48, marginTop: 18, paddingHorizontal: 16, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: '#CFC5BC', borderRadius: 16, backgroundColor: '#FFFFFF' },
  productDetailsButtonText: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '700', color: '#4B4039' },
  productDetailsButtonArrow: { flexShrink: 0, fontSize: 18, color: '#8A6C5B' },
  welcomeGift: { marginTop: 14, alignItems: 'stretch', padding: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: '#DED7D0', borderRadius: 18, backgroundColor: '#FAF8F5' },
  giftCopy: { width: '100%', minWidth: 0 },
  giftTitle: { fontSize: 13, lineHeight: 19, fontWeight: '600', color: '#4A433E' },
  giftPackLink: { width: '100%', maxWidth: 300, aspectRatio: 565 / 258, alignSelf: 'center', overflow: 'hidden', marginTop: 12, borderRadius: 12 },
  giftPackImage: { width: '100%', height: '100%', borderRadius: 12 },
  servingTableSection: { marginTop: 22 },
  servingTableHint: { marginTop: 5, fontSize: 12, lineHeight: 18, color: '#7B746D' },
  servingTableScroll: { paddingTop: 13, paddingBottom: 3 },
  servingTable: { overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: '#D8D1C9', borderRadius: 14 },
  servingTableRow: { flexDirection: 'row', minHeight: 42, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E4DED7' },
  servingTableHeaderRow: { minHeight: 48, borderTopWidth: 0, backgroundColor: '#F1ECE6' },
  servingTableCell: { width: 70, paddingHorizontal: 5, paddingVertical: 11, borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: '#E4DED7', fontSize: 11, lineHeight: 16, color: '#4B4540', textAlign: 'center' },
  servingWeightCell: { width: 80, borderLeftWidth: 0 },
  servingTableHeader: { fontSize: 10, lineHeight: 14, fontWeight: '700', color: '#594F48' },
  servingTableWeight: { fontWeight: '700', color: '#302A26' },
  servingFootnote: { marginTop: 9, fontSize: 11, lineHeight: 17, color: '#817970' },
  secondaryButton: { width: '100%', minWidth: 0, minHeight: 48, marginTop: 6, alignItems: 'center', justifyContent: 'center' },
  secondaryButtonText: { fontSize: 14, fontWeight: '700', color: '#4B4039' },
  primaryButton: { width: '100%', minWidth: 0, minHeight: 56, marginTop: 25, paddingHorizontal: 19, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 17, backgroundColor: '#2D2824' },
  primaryButtonLight: { backgroundColor: '#FFFFFF' },
  primaryButtonText: { minWidth: 0, flexShrink: 1, fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  primaryButtonTextLight: { color: '#3B2B24' },
  primaryButtonArrow: { flexShrink: 0, marginLeft: 8, fontSize: 18, color: '#FFFFFF' },
  productModalPurchase: { marginTop: -17 },
  insuranceHeadingRow: { minWidth: 0, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 9 },
  insuranceQuestion: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, color: '#8A6C5B' },
  insuranceRecommended: { paddingHorizontal: 9, paddingVertical: 5, overflow: 'hidden', borderRadius: 99, fontSize: 8, fontWeight: '800', letterSpacing: 1.1, color: '#6F4E40', backgroundColor: '#EADFD8' },
  insuranceCard: { width: '100%', maxWidth: 960, minWidth: 0, alignSelf: 'center', overflow: 'hidden', borderRadius: 30, backgroundColor: '#6F4E40', ...softShadow },
  insuranceBannerLink: { width: '100%', maxWidth: 960, minWidth: 0, alignSelf: 'center', overflow: 'hidden', marginTop: 14, borderRadius: 20, backgroundColor: '#E2F2ED', ...softShadow },
  insuranceBanner: { width: '100%', maxWidth: '100%', minWidth: 0, alignSelf: 'stretch', aspectRatio: 671 / 171, backgroundColor: '#E2F2ED' },
  insuranceContent: { width: '100%', minWidth: 0, padding: 25 },
  insuranceInfoTitle: { fontSize: 25, lineHeight: 31, fontWeight: '600', letterSpacing: -0.6, color: '#FFFFFF' },
  insuranceBody: { marginTop: 15, fontSize: 14, lineHeight: 22, color: '#E9DDD6' },
  insuranceInfoLink: { alignSelf: 'flex-start', marginTop: 12, fontSize: 13, lineHeight: 20, fontWeight: '700', color: '#F3E8E1', textDecorationLine: 'underline' },
  contactCard: { minHeight: 145, flexDirection: 'row', alignItems: 'flex-start', gap: 16, padding: 22, borderRadius: 28, backgroundColor: '#FFFFFF', ...softShadow },
  contactAvatar: { width: 54, height: 54, alignItems: 'center', justifyContent: 'center', borderRadius: 27, backgroundColor: '#E9DDD5' },
  contactInitial: { fontSize: 20, fontWeight: '600', color: '#745747' },
  contactCopy: { flex: 1, minWidth: 0 },
  contactRole: { marginTop: 6, fontSize: 13, lineHeight: 19, color: '#7B746D' },
  contactActions: { marginTop: 18, gap: 8 },
  contactAction: { minHeight: 50, justifyContent: 'center', paddingHorizontal: 15, paddingVertical: 9, borderWidth: StyleSheet.hairlineWidth, borderColor: '#DED7D0', borderRadius: 15, backgroundColor: '#FAF8F5' },
  contactDetail: { minHeight: 50, justifyContent: 'center', paddingHorizontal: 15, paddingVertical: 9, borderWidth: StyleSheet.hairlineWidth, borderColor: '#DED7D0', borderRadius: 15, backgroundColor: '#FAF8F5' },
  contactActionLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1.1, color: '#9A7765', textTransform: 'uppercase' },
  contactActionValue: { marginTop: 3, fontSize: 14, lineHeight: 19, fontWeight: '700', color: '#3D3631' },
  primaryContactButton: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, borderRadius: 16, backgroundColor: '#2D2824' },
  primaryContactButtonText: { flex: 1, fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  primaryContactButtonArrow: { marginLeft: 8, fontSize: 24, fontWeight: '300', color: '#FFFFFF' },
  actionSheetLayer: { flex: 1, justifyContent: 'flex-end' },
  actionSheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(33,31,28,0.36)' },
  actionSheet: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 18, borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: '#FFFFFF', ...softShadow },
  actionSheetHandle: { width: 38, height: 4, alignSelf: 'center', borderRadius: 2, backgroundColor: '#D8D1C9' },
  actionSheetTitle: { paddingVertical: 18, fontSize: 19, lineHeight: 24, fontWeight: '700', color: '#302A26', textAlign: 'center' },
  actionSheetAction: { minHeight: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 17, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E4DED7' },
  actionSheetActionPressed: { backgroundColor: '#F7F5F1' },
  actionSheetSymbol: { width: 36, fontSize: 18 },
  actionSheetActionLabel: { fontSize: 15, fontWeight: '700', color: '#3D3631' },
  actionSheetCancel: { minHeight: 52, marginTop: 8, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: '#F1ECE6' },
  actionSheetCancelText: { fontSize: 14, fontWeight: '700', color: '#5B4E46' },
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
  sgServiceFooter: { alignItems: 'center', marginTop: 42, paddingTop: 28, paddingBottom: 4, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#DDD7D0' },
  sgServiceAnchor: { width: '100%', textDecorationLine: 'none' },
  sgServiceLink: { width: '100%', minHeight: 146, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24 },
  sgServiceText: { fontSize: 12, lineHeight: 18, fontWeight: '600', letterSpacing: 0.1, color: '#706A63', textAlign: 'center' },
  sgServiceLogo: { width: 112, height: 112, marginTop: 6 },
});
