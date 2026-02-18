import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/tokens';
import { useBottomNavInset } from '../../navigation/bottomNav';

export function AppScreen({
  children,
  scroll = false,
  keyboardAvoiding = false,
  safe = true,
  noPadding = false,
  withBottomNavPadding = true,
  edges = ['top', 'bottom'],
  variant = 'default',
  paddingHorizontal = spacing.lg,
  paddingTop = spacing.lg,
  paddingBottom = spacing.lg,
  style,
  contentStyle,
  contentContainerStyle,
  ...props
}) {
  const { colors } = useTheme();
  const bottomNavInset = useBottomNavInset({ enabled: withBottomNavPadding });

  const backgroundColor =
    variant === 'transparent'
      ? 'transparent'
      : variant === 'subtle'
      ? colors.surface
      : colors.background;

  const containerStyles = [styles.container, { backgroundColor }, style];
  const resolvedPadding = {
    paddingHorizontal: noPadding ? 0 : paddingHorizontal,
    paddingTop: noPadding ? 0 : paddingTop,
    paddingBottom: noPadding ? 0 : paddingBottom,
  };

  const mergedContentStyle = StyleSheet.flatten([contentStyle, contentContainerStyle]) || {};
  const desiredPaddingBottom =
    typeof mergedContentStyle.paddingBottom === 'number'
      ? mergedContentStyle.paddingBottom
      : resolvedPadding.paddingBottom;
  const navPaddingStyle =
    bottomNavInset > 0 ? { paddingBottom: desiredPaddingBottom + bottomNavInset } : null;

  const contentStyles = [styles.content, resolvedPadding, contentStyle];

  const content = scroll ? (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[contentStyles, contentContainerStyle, navPaddingStyle]}
      keyboardShouldPersistTaps="handled"
      {...props}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[contentStyles, contentContainerStyle, navPaddingStyle]} {...props}>
      {children}
    </View>
  );

  const body = keyboardAvoiding ? (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {content}
    </KeyboardAvoidingView>
  ) : (
    content
  );

  if (!safe) {
    return <View style={containerStyles}>{body}</View>;
  }

  return (
    <SafeAreaView style={containerStyles} edges={edges}>
      {body}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
});
