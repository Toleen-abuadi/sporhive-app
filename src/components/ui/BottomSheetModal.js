import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { borderRadius, spacing } from '../../theme/tokens';

export function BottomSheetModal({ visible, onClose, children }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.full}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface, // ✅ solid background
              borderColor: colors.border,
              paddingBottom: Math.max(insets.bottom, spacing.md),
            },
          ]}
        >
          <View style={styles.handle} />

          <View style={styles.content}>
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
    borderTopWidth: 1,
    overflow: 'hidden',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },

  handle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 999,
    marginBottom: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },

  content: {
    paddingBottom: spacing.lg,
  },
});
