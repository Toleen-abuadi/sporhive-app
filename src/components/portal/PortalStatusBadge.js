import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '../ui/Text';
import { useTheme } from '../../theme/ThemeProvider';

const tone = (colors, severity) => {
  if (severity === 'success') return { bg: '#173A26', border: '#2A6B46', text: colors.success };
  if (severity === 'warning') return { bg: '#3D2A0F', border: '#805018', text: colors.warning };
  if (severity === 'danger') return { bg: '#3F1D1D', border: '#7A2E2E', text: colors.error };
  if (severity === 'info') return { bg: '#1E2D42', border: '#345277', text: colors.accentOrange };
  return { bg: colors.surfaceElevated || colors.surface, border: colors.border, text: colors.textSecondary };
};

export function PortalStatusBadge({ label, severity = 'neutral' }) {
  const { colors } = useTheme();
  const palette = tone(colors, severity);
  return (
    <View style={[styles.badge, { backgroundColor: palette.bg, borderColor: palette.border }]}>
      <Text variant="caption" weight="bold" color={palette.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({ badge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 } });
