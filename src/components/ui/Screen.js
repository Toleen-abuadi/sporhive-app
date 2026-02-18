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

export function Screen({
  children,
  scroll = false,
  safe = true,
  keyboardAvoiding = false,
  noPadding = false,
  withBottomNavPadding = true,
  edges = ['top', 'bottom'],
  style,
  contentStyle,
  contentContainerStyle,
  paddingHorizontal = spacing.lg,
  paddingTop = spacing.lg,
  paddingBottom = spacing.lg,
  showsVerticalScrollIndicator = false,
  keyboardShouldPersistTaps = 'handled',
  ...props
}) {
  const { colors } = useTheme();
  const bottomNavInset = useBottomNavInset({ enabled: withBottomNavPadding });

  const resolvedPadding = {
    paddingHorizontal: noPadding ? 0 : paddingHorizontal,
    paddingTop: noPadding ? 0 : paddingTop,
    paddingBottom: noPadding ? 0 : paddingBottom,
  };

  const containerStyles = [styles.container, { backgroundColor: colors.background }, style];
  const mergedContentStyle = StyleSheet.flatten([contentStyle, contentContainerStyle]) || {};
  const desiredPaddingBottom =
    typeof mergedContentStyle.paddingBottom === 'number'
      ? mergedContentStyle.paddingBottom
      : resolvedPadding.paddingBottom;
  const navPaddingStyle =
    bottomNavInset > 0 ? { paddingBottom: desiredPaddingBottom + bottomNavInset } : null;

  const content = scroll ? (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.scrollContent,
        resolvedPadding,
        contentStyle,
        contentContainerStyle,
        navPaddingStyle,
      ]}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
      {...props}
    >
      {children}
    </ScrollView>
  ) : (
    <View
      style={[styles.content, resolvedPadding, contentStyle, contentContainerStyle, navPaddingStyle]}
      {...props}
    >
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
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});
