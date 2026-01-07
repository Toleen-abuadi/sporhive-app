// src/components/portal/PortalModal.js
import React, { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';
import { colors, spacing, radius, typography } from '../../theme/portal.styles';

export const PortalModal = ({
  visible,
  title,
  subtitle,
  onClose,
  children,
  footer,
}) => {
  useEffect(() => {}, [visible]);

  return (
    <Modal transparent visible={!!visible} animationType="none" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View entering={FadeInUp.duration(220)} exiting={FadeOutDown.duration(180)} style={styles.sheet}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{title}</Text>
              {!!subtitle && <Text style={styles.sub}>{subtitle}</Text>}
            </View>
            <Pressable onPress={onClose} style={({ pressed }) => [styles.close, pressed ? { opacity: 0.8 } : null]}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

          <View style={styles.body}>{children}</View>

          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.backgroundCard,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderMedium,
    paddingBottom: spacing.lg,
    maxHeight: '92%',
  },
  header: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  title: {
    color: colors.textPrimary,
    fontFamily: typography.family.bold,
    fontSize: typography.sizes.xl,
  },
  sub: {
    marginTop: 4,
    color: colors.textSecondary,
    fontFamily: typography.family.regular,
    fontSize: typography.sizes.sm,
    lineHeight: typography.sizes.sm * 1.35,
  },
  close: {
    width: 36,
    height: 36,
    borderRadius: radius.round,
    backgroundColor: colors.backgroundElevated,
    borderWidth: 1,
    borderColor: colors.borderMedium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontFamily: typography.family.bold,
  },
  body: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.sm,
  },
  footer: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.md,
  },
});
