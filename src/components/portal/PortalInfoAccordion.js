import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ChevronDown, ChevronUp, CircleHelp } from 'lucide-react-native';
import { Text } from '../ui/Text';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/tokens';

export function PortalInfoAccordion({ title = 'What is this?', summary, bullets = [] }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}> 
      <Pressable style={styles.header} onPress={() => setOpen((v) => !v)} accessibilityRole="button">
        <View style={styles.titleRow}>
          <CircleHelp size={16} color={colors.accentOrange} />
          <Text variant="body" weight="bold" color={colors.textPrimary}>{title}</Text>
        </View>
        {open ? <ChevronUp size={16} color={colors.textMuted} /> : <ChevronDown size={16} color={colors.textMuted} />}
      </Pressable>
      <Text variant="caption" color={colors.textSecondary}>{summary}</Text>
      {open ? (
        <View style={styles.bullets}>
          {bullets.map((bullet, idx) => (
            <View key={`${bullet}-${idx}`} style={styles.bulletRow}>
              <Text variant="caption" color={colors.accentOrange}>•</Text>
              <Text variant="caption" color={colors.textSecondary} style={{ flex: 1 }}>{bullet}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: spacing.md, gap: spacing.xs },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  bullets: { marginTop: spacing.xs, gap: 6 },
  bulletRow: { flexDirection: 'row', gap: spacing.xs, alignItems: 'flex-start' },
});
