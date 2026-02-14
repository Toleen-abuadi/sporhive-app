// src/screens/playgrounds/bookingWizard.ui.js
import { StyleSheet } from 'react-native';
import { spacing } from '../../theme/tokens';

export const makeWizardStyles = (colors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },

    content: {
      padding: spacing.lg,
      paddingBottom: spacing['2xl'],
      gap: 14,
    },

    footerSpacer: { height: 24 },
  });
