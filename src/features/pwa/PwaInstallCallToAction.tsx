import { useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { InstallPlatform } from './usePwaInstall';
import { usePwaInstall } from './usePwaInstall';

export function PwaInstallCallToAction({ petName }: { petName: string }) {
  const { canPrompt, isReady, isStandalone, outcome, platform, promptInstall } = usePwaInstall();
  const [instructionsVisible, setInstructionsVisible] = useState(false);

  if (Platform.OS !== 'web' || !isReady || isStandalone || outcome === 'accepted') return null;

  const handlePress = async () => {
    if (canPrompt) {
      await promptInstall();
      return;
    }
    setInstructionsVisible(true);
  };

  return (
    <>
      <Pressable
        accessibilityHint="Instala este espacio como una aplicación en tu dispositivo"
        accessibilityLabel={`Pon a ${petName} en tu pantalla de inicio`}
        accessibilityRole="button"
        onPress={handlePress}
        style={({ pressed, hovered }) => [styles.card, hovered && styles.cardHovered, pressed && styles.cardPressed]}
      >
        <View aria-hidden style={styles.iconCircle}>
          <Text style={styles.icon}>⌂</Text>
        </View>
        <View style={styles.copy}>
          <Text style={styles.eyebrow}>SIEMPRE CERCA</Text>
          <Text style={styles.title}>📲 Pon a {petName} en tu pantalla de inicio</Text>
          <Text style={styles.body}>Abre su espacio con un solo toque.</Text>
        </View>
        <Text aria-hidden style={styles.arrow}>→</Text>
      </Pressable>
      <InstallInstructions
        onClose={() => setInstructionsVisible(false)}
        petName={petName}
        platform={platform}
        visible={instructionsVisible}
      />
    </>
  );
}

function InstallInstructions({
  onClose,
  petName,
  platform,
  visible,
}: {
  onClose: () => void;
  petName: string;
  platform: InstallPlatform;
  visible: boolean;
}) {
  const instructions = platform === 'ios'
    ? [
        ['1', 'Pulsa el botón Compartir de Safari', 'Es el cuadrado con una flecha hacia arriba.'],
        ['2', 'Selecciona “Añadir a pantalla de inicio”', 'Desliza el menú si aún no ves la opción.'],
        ['3', 'Confirma pulsando “Añadir”', `${petName} aparecerá junto a tus aplicaciones.`],
      ]
    : platform === 'android'
      ? [
          ['1', 'Abre el menú del navegador', 'Pulsa los tres puntos de la parte superior.'],
          ['2', 'Elige la opción de instalación', 'Puede llamarse “Instalar aplicación” o “Añadir a pantalla de inicio”.'],
          ['3', 'Confirma la instalación', `${petName} aparecerá junto a tus aplicaciones.`],
        ]
      : [
          ['1', 'Abre el menú de tu navegador', 'Busca sus opciones para esta página.'],
          ['2', 'Selecciona la opción de instalación', 'Puede llamarse “Instalar” o “Añadir a pantalla de inicio”.'],
          ['3', 'Confirma', `Así podrás abrir el espacio de ${petName} con un solo toque.`],
        ];

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <SafeAreaView style={styles.modalOverlay}>
        <Pressable accessibilityLabel="Cerrar instrucciones" onPress={onClose} style={styles.modalDismissArea} />
        <View accessibilityViewIsModal style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <View style={styles.copy}>
              <Text style={styles.eyebrow}>ACCESO DIRECTO</Text>
              <Text style={styles.sheetTitle}>Lleva a {petName} contigo</Text>
            </View>
            <Pressable accessibilityLabel="Cerrar" accessibilityRole="button" hitSlop={10} onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>×</Text>
            </Pressable>
          </View>
          <Text style={styles.sheetLead}>
            {platform === 'ios' ? 'En Safari, solo tienes que seguir estos pasos:' : 'Sigue estos pasos en tu navegador:'}
          </Text>
          <View style={styles.steps}>
            {instructions.map(([number, title, detail]) => (
              <View key={number} style={styles.step}>
                <View style={styles.stepNumber}><Text style={styles.stepNumberText}>{number}</Text></View>
                <View style={styles.copy}>
                  <Text style={styles.stepTitle}>{title}</Text>
                  <Text style={styles.stepDetail}>{detail}</Text>
                </View>
              </View>
            ))}
          </View>
          <Pressable accessibilityRole="button" onPress={onClose} style={({ pressed }) => [styles.doneButton, pressed && styles.cardPressed]}>
            <Text style={styles.doneButtonText}>Entendido</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const shadow = Platform.select({
  ios: { shadowColor: '#3A2419', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.16, shadowRadius: 24 },
  android: { elevation: 5 },
  default: { boxShadow: '0 14px 38px rgba(58, 36, 25, 0.14)' },
}) as object;

const styles = StyleSheet.create({
  card: { minHeight: 96, flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 17, paddingHorizontal: 16, borderRadius: 24, backgroundColor: '#FFF9F3', borderWidth: 1, borderColor: '#E9D7C9', ...shadow },
  cardHovered: { borderColor: '#D9B9A2', transform: [{ translateY: -1 }] },
  cardPressed: { opacity: 0.84, transform: [{ scale: 0.99 }] },
  iconCircle: { width: 50, height: 50, flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: 25, backgroundColor: '#8D5942' },
  icon: { marginTop: -2, fontSize: 28, lineHeight: 32, color: '#FFFFFF' },
  copy: { flex: 1, minWidth: 0 },
  eyebrow: { fontSize: 9, fontWeight: '800', letterSpacing: 1.5, color: '#9A7765' },
  title: { marginTop: 5, fontSize: 16, lineHeight: 21, fontWeight: '700', color: '#2A211C' },
  body: { marginTop: 3, fontSize: 12, lineHeight: 17, color: '#7C6F67' },
  arrow: { flexShrink: 0, fontSize: 22, color: '#8D5942' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(30, 24, 20, 0.46)' },
  modalDismissArea: { flex: 1 },
  sheet: { width: '100%', maxWidth: 620, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 22, borderTopLeftRadius: 30, borderTopRightRadius: 30, backgroundColor: '#F7F5F1' },
  sheetHandle: { width: 42, height: 4, alignSelf: 'center', marginBottom: 19, borderRadius: 2, backgroundColor: '#D8D0C8' },
  sheetHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  sheetTitle: { marginTop: 7, fontSize: 27, lineHeight: 32, fontWeight: '700', letterSpacing: -0.7, color: '#25211E' },
  closeButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 21, backgroundColor: '#ECE7E1' },
  closeButtonText: { marginTop: -2, fontSize: 27, fontWeight: '300', color: '#514A44' },
  sheetLead: { marginTop: 12, fontSize: 15, lineHeight: 22, color: '#746D66' },
  steps: { marginTop: 20, gap: 12 },
  step: { minHeight: 72, flexDirection: 'row', alignItems: 'flex-start', gap: 13, padding: 14, borderRadius: 18, backgroundColor: '#FFFFFF' },
  stepNumber: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: '#8D5942' },
  stepNumberText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
  stepTitle: { fontSize: 14, lineHeight: 19, fontWeight: '700', color: '#322B26' },
  stepDetail: { marginTop: 3, fontSize: 12, lineHeight: 17, color: '#817870' },
  doneButton: { minHeight: 54, marginTop: 20, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: '#2D2824' },
  doneButtonText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
});
