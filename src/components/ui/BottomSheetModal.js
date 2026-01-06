import React from 'react';
import { Modal, Pressable, StyleSheet, View, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { borderRadius, spacing } from '../../theme/tokens';

export function BottomSheetModal({ visible, onClose, children }) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.full}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          <BlurView
            intensity={isDark ? 30 : 20}
            tint={isDark ? 'dark' : 'light'}
            style={[StyleSheet.absoluteFill, { borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl }]}
          />
          <View style={[styles.sheetInner, { backgroundColor: Platform.OS === 'web' ? colors.surface : 'transparent', borderColor: colors.border }]}>
            {children}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  full: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  sheetInner: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    borderTopWidth: 1,
    padding: spacing.lg,
  },
});
