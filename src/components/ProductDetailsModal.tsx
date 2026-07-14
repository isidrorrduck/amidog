import type { ReactNode } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export interface ProductDetailGroup {
  title: string;
  items?: string[];
  body?: string;
}

export interface ProductDetailSection {
  title: string;
  body?: string;
  note?: string;
  items?: string[];
  groups?: ProductDetailGroup[];
  chips?: string[];
}

interface ProductDetailsModalProps {
  eyebrow?: string;
  footer?: ReactNode;
  onClose: () => void;
  sections: ProductDetailSection[];
  title: string;
  visible: boolean;
}

/** Reusable, cross-platform detail view for products shown inside AmiDog. */
export function ProductDetailsModal({
  eyebrow = 'DETALLES DEL PRODUCTO',
  footer,
  onClose,
  sections,
  title,
  visible,
}: ProductDetailsModalProps) {
  return (
    <Modal
      animationType="slide"
      hardwareAccelerated
      onRequestClose={onClose}
      presentationStyle="fullScreen"
      statusBarTranslucent={Platform.OS === 'android'}
      visible={visible}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View style={styles.heading}>
            <Text style={styles.eyebrow}>{eyebrow}</Text>
            <Text style={styles.title}>{title}</Text>
          </View>
          <Pressable
            accessibilityLabel="Cerrar"
            accessibilityRole="button"
            hitSlop={10}
            onPress={onClose}
            style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
          >
            <Text style={styles.closeButtonText}>×</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
          style={styles.scroll}
        >
          {sections.map((section) => (
            <View key={section.title} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              {section.body ? <Text style={styles.body}>{section.body}</Text> : null}
              {section.note ? <Text style={styles.note}>{section.note}</Text> : null}
              {section.items ? <DetailList items={section.items} /> : null}
              {section.groups?.map((group) => (
                <View key={group.title} style={styles.group}>
                  <Text style={styles.groupTitle}>{group.title}</Text>
                  {group.body ? <Text style={styles.body}>{group.body}</Text> : null}
                  {group.items ? <DetailList items={group.items} /> : null}
                </View>
              ))}
              {section.chips ? (
                <View style={styles.chips}>
                  {section.chips.map((chip) => <Text key={chip} style={styles.chip}>{chip}</Text>)}
                </View>
              ) : null}
            </View>
          ))}
        </ScrollView>

        <View style={styles.footer}>
          {footer}
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.closeAction}>
            <Text style={styles.closeActionText}>Cerrar</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function DetailList({ items }: { items: string[] }) {
  return (
    <View style={styles.list}>
      {items.map((item) => (
        <View key={item} style={styles.listItem}>
          <View style={styles.listMark} />
          <Text style={styles.listText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F7F5F1' },
  header: { width: '100%', maxWidth: 900, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  heading: { flex: 1, minWidth: 0, paddingRight: 16 },
  eyebrow: { fontSize: 9, fontWeight: '700', letterSpacing: 1.5, color: '#9A7765' },
  title: { marginTop: 4, fontSize: 24, lineHeight: 29, fontWeight: '600', color: '#28231F' },
  closeButton: { width: 42, height: 42, flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: 21, backgroundColor: '#ECE7E1' },
  closeButtonText: { marginTop: -2, fontSize: 28, lineHeight: 30, fontWeight: '300', color: '#443B35' },
  pressed: { opacity: 0.72 },
  scroll: { flex: 1 },
  content: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24, gap: 12 },
  section: { padding: 20, borderRadius: 20, backgroundColor: '#FFFFFF' },
  sectionTitle: { fontSize: 18, lineHeight: 23, fontWeight: '700', color: '#302A26' },
  body: { marginTop: 9, fontSize: 14, lineHeight: 22, color: '#625B55' },
  note: { marginTop: 10, fontSize: 12, lineHeight: 18, fontStyle: 'italic', color: '#817970' },
  list: { marginTop: 9, gap: 7 },
  listItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  listMark: { width: 6, height: 6, marginTop: 8, flexShrink: 0, borderRadius: 3, backgroundColor: '#9A7765' },
  listText: { flex: 1, fontSize: 14, lineHeight: 21, color: '#625B55' },
  group: { marginTop: 17, paddingTop: 15, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E4DED7' },
  groupTitle: { fontSize: 14, lineHeight: 19, fontWeight: '700', color: '#493F39' },
  chips: { marginTop: 13, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { overflow: 'hidden', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 99, fontSize: 12, lineHeight: 16, fontWeight: '700', color: '#6F5143', backgroundColor: '#F1E9E3' },
  footer: { width: '100%', maxWidth: 900, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#DED7D0', backgroundColor: '#F7F5F1' },
  closeAction: { minHeight: 46, alignItems: 'center', justifyContent: 'center' },
  closeActionText: { fontSize: 14, fontWeight: '700', color: '#6F625A' },
});
