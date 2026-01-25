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

export function AppScreen({
  children,
  scroll = false,
  keyboardAvoiding = false,
  safe = true,
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

  const backgroundColor =
    variant === 'transparent'
      ? 'transparent'
      : variant === 'subtle'
      ? colors.surface
      : colors.background;

  const containerStyles = [styles.container, { backgroundColor }, style];
  const contentStyles = [
    styles.content,
    { paddingHorizontal, paddingTop, paddingBottom },
    contentStyle,
  ];

  const content = scroll ? (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[contentStyles, contentContainerStyle]}
      keyboardShouldPersistTaps="handled"
      {...props}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={contentStyles} {...props}>
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
    <SafeAreaView style={containerStyles} edges={['top', 'bottom']}>
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
