import React from 'react';
import { StyleSheet } from 'react-native';
import { spacing } from '../../theme/tokens';
import { AppHeader } from '../ui/AppHeader';
import { useSmartBack } from '../../navigation/useSmartBack';

export function PortalHeader({
  title,
  subtitle,
  right,
  rightSlot,
  leftSlot,
  style,
  showBack = true,
  fallbackRoute = '/portal/home',
  onBack,
}) {
  const { goBack } = useSmartBack({ fallbackRoute });
  return (
    <AppHeader
      title={title}
      subtitle={subtitle}
      right={right || rightSlot}
      leftSlot={leftSlot}
      showBack={showBack}
      onBackPress={onBack || goBack}
      fallbackRoute={fallbackRoute}
      variant="transparent"
      style={[styles.header, style]}
    />
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: spacing.lg,
  },
});
