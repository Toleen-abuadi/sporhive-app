import React, { useEffect, useState } from 'react';
import { Modal, View, StyleSheet, Pressable } from 'react-native';
import { Text } from '../ui/Text';
import { Button } from '../ui/Button';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/tokens';

export function PortalConfirmSheet({
  visible,
  title,
  description,
  warning,
  policyPoints = [],
  requireAcknowledge = false,
  acknowledgeLabel = 'I understand and want to continue',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}) {
  const { colors } = useTheme();
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    if (!visible) setAcknowledged(false);
  }, [visible]);

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => {}}>
          <Text variant="body" weight="bold" color={colors.textPrimary}>{title}</Text>
          {description ? <Text variant="bodySmall" color={colors.textSecondary}>{description}</Text> : null}
          {policyPoints.length ? (
            <View style={styles.policyWrap}>
              {policyPoints.map((point, idx) => (
                <View key={`${point}-${idx}`} style={styles.policyRow}>
                  <Text variant="caption" color={colors.accentOrange}>•</Text>
                  <Text variant="caption" color={colors.textSecondary} style={{ flex: 1 }}>{point}</Text>
                </View>
              ))}
            </View>
          ) : null}
          {warning ? <Text variant="caption" color={colors.error}>{warning}</Text> : null}

          {requireAcknowledge ? (
            <Pressable style={styles.ackRow} onPress={() => setAcknowledged((v) => !v)}>
              <View style={[styles.checkbox, { borderColor: colors.border, backgroundColor: acknowledged ? colors.accentOrange : 'transparent' }]} />
              <Text variant="caption" color={colors.textPrimary}>{acknowledgeLabel}</Text>
            </Pressable>
          ) : null}

          <View style={styles.row}>
            <Button variant="secondary" onPress={onCancel}>{cancelLabel}</Button>
            <Button onPress={onConfirm} disabled={requireAcknowledge && !acknowledged}>{confirmLabel}</Button>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, padding: spacing.lg, gap: spacing.sm },
  policyWrap: { gap: 6 },
  policyRow: { flexDirection: 'row', gap: spacing.xs, alignItems: 'flex-start' },
  ackRow: { marginTop: spacing.xs, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  checkbox: { width: 16, height: 16, borderRadius: 4, borderWidth: 1 },
  row: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.sm },
});
