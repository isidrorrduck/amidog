import { ActivityIndicator, Modal, Platform, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import type { PuppyPhotoPhase, PuppyPhotoSource } from './types';

export function PuppyPhotoControl({
  errorMessage,
  hasPhoto,
  onChoose,
  onClose,
  onOpen,
  petName,
  phase,
  visible,
}: {
  errorMessage: string | null;
  hasPhoto: boolean;
  onChoose: (source: PuppyPhotoSource) => void;
  onClose: () => void;
  onOpen: () => void;
  petName: string;
  phase: PuppyPhotoPhase;
  visible: boolean;
}) {
  const busy = phase !== 'idle' && phase !== 'loading';

  return (
    <>
      <Pressable
        accessibilityHint="Abre las opciones para hacer o elegir una fotografía"
        accessibilityLabel={hasPhoto ? `Cambiar foto de ${petName}` : `Pon una foto de ${petName}`}
        accessibilityRole="button"
        disabled={busy}
        onPress={onOpen}
        style={({ pressed }) => [styles.photoButton, pressed && styles.pressed]}
      >
        <Text aria-hidden style={styles.photoButtonIcon}>▣</Text>
        <Text style={styles.photoButtonText}>{hasPhoto ? 'Cambiar foto' : `Pon una foto de ${petName}`}</Text>
      </Pressable>

      {busy ? (
        <View accessibilityLiveRegion="polite" style={styles.processingOverlay}>
          <ActivityIndicator color="#FFFFFF" />
          <Text style={styles.processingText}>{getPhaseLabel(phase)}</Text>
        </View>
      ) : null}

      <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
        <SafeAreaView style={styles.modalOverlay}>
          <Pressable accessibilityLabel="Cerrar opciones de foto" disabled={busy} onPress={onClose} style={styles.dismissArea} />
          <View accessibilityViewIsModal style={styles.sheet}>
            <View style={styles.handle} />
            <View style={styles.header}>
              <View style={styles.copy}>
                <Text style={styles.eyebrow}>SU ESPACIO, MÁS SUYO</Text>
                <Text style={styles.title}>{hasPhoto ? `Cambia la foto de ${petName}` : `Pon una foto de ${petName}`}</Text>
              </View>
              <Pressable accessibilityLabel="Cerrar" accessibilityRole="button" disabled={busy} hitSlop={10} onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeText}>×</Text>
              </Pressable>
            </View>
            <Text style={styles.lead}>Elige cómo quieres añadirla.</Text>

            {errorMessage ? (
              <View accessibilityLiveRegion="assertive" style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            <View style={styles.options}>
              <PhotoOption
                disabled={busy}
                icon="◎"
                label="Hacer una foto"
                onPress={() => onChoose('camera')}
              />
              <PhotoOption
                disabled={busy}
                icon="▧"
                label="Elegir de la galería"
                onPress={() => onChoose('library')}
              />
            </View>
            {busy ? (
              <View accessibilityLiveRegion="polite" style={styles.sheetProgress}>
                <ActivityIndicator color="#8D5942" />
                <Text style={styles.sheetProgressText}>{getPhaseLabel(phase)}</Text>
              </View>
            ) : null}
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}

function PhotoOption({ disabled, icon, label, onPress }: { disabled: boolean; icon: string; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.option, pressed && styles.pressed, disabled && styles.disabled]}
    >
      <View style={styles.optionIcon}><Text style={styles.optionIconText}>{icon}</Text></View>
      <Text style={styles.optionLabel}>{label}</Text>
      <Text aria-hidden style={styles.optionArrow}>→</Text>
    </Pressable>
  );
}

function getPhaseLabel(phase: PuppyPhotoPhase) {
  if (phase === 'permission') return 'Solicitando permiso para la cámara…';
  if (phase === 'picking') return 'Abriendo tus fotos…';
  if (phase === 'processing') return 'Preparando la foto…';
  if (phase === 'saving') return 'Guardando en este dispositivo…';
  return 'Cargando la foto…';
}

const styles = StyleSheet.create({
  photoButton: { position: 'absolute', zIndex: 4, right: -2, bottom: -2, width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFFFFF', borderRadius: 16, backgroundColor: '#F3E9E2', ...Platform.select({ default: { boxShadow: '0 5px 14px rgba(36, 27, 22, 0.18)' }, android: { elevation: 4 }, ios: { shadowColor: '#241B16', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 10 } }) },
  photoButtonIcon: { fontSize: 14, color: '#8D5942' },
  photoButtonText: { display: 'none' },
  pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.55 },
  processingOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 3, alignItems: 'center', justifyContent: 'center', gap: 9, backgroundColor: 'rgba(31, 25, 21, 0.48)' },
  processingText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(30, 24, 20, 0.48)' },
  dismissArea: { flex: 1 },
  sheet: { width: '100%', maxWidth: 620, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 24, borderTopLeftRadius: 30, borderTopRightRadius: 30, backgroundColor: '#F7F5F1' },
  handle: { width: 42, height: 4, alignSelf: 'center', marginBottom: 19, borderRadius: 2, backgroundColor: '#D8D0C8' },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  copy: { flex: 1, minWidth: 0 },
  eyebrow: { fontSize: 9, fontWeight: '800', letterSpacing: 1.5, color: '#9A7765' },
  title: { marginTop: 7, fontSize: 27, lineHeight: 32, fontWeight: '700', letterSpacing: -0.7, color: '#25211E' },
  lead: { marginTop: 10, fontSize: 15, lineHeight: 21, color: '#746D66' },
  closeButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 21, backgroundColor: '#ECE7E1' },
  closeText: { marginTop: -2, fontSize: 27, fontWeight: '300', color: '#514A44' },
  errorBox: { marginTop: 16, padding: 13, borderRadius: 14, backgroundColor: '#F7E9E4', borderWidth: 1, borderColor: '#EBCFC5' },
  errorText: { fontSize: 13, lineHeight: 19, color: '#7A3F31' },
  options: { marginTop: 20, gap: 11 },
  option: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 14, borderRadius: 19, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E9E3DC' },
  optionIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19, backgroundColor: '#F1E5DC' },
  optionIconText: { fontSize: 22, color: '#8D5942' },
  optionLabel: { flex: 1, fontSize: 15, fontWeight: '700', color: '#322B26' },
  optionArrow: { fontSize: 20, color: '#8D5942' },
  sheetProgress: { minHeight: 48, marginTop: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  sheetProgressText: { fontSize: 13, fontWeight: '700', color: '#6F625A' },
});
