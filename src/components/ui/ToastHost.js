import React, { createContext, useContext, useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  Animated,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing, borderRadius, shadows } from '../../theme/tokens';
import { Text } from './Text';

const ToastContext = createContext();

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type, duration }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, duration);
  }, []);

  const success = useCallback((message, duration) => showToast(message, 'success', duration), [showToast]);
  const error = useCallback((message, duration) => showToast(message, 'error', duration), [showToast]);
  const warning = useCallback((message, duration) => showToast(message, 'warning', duration), [showToast]);
  const info = useCallback((message, duration) => showToast(message, 'info', duration), [showToast]);

  return (
    <ToastContext.Provider value={{ success, error, warning, info }}>
      {children}
      <ToastContainer toasts={toasts} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts }) {
  return (
    <View style={styles.container} pointerEvents="box-none">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} />
      ))}
    </View>
  );
}

function Toast({ message, type }) {
  const { colors } = useTheme();
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);

  React.useEffect(() => {
    translateY.value = withSpring(0, { damping: 15 });
    opacity.value = withTiming(1, { duration: 200 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const icons = {
    success: 'check-circle',
    error: 'x-circle',
    warning: 'alert-triangle',
    info: 'info',
  };

  const iconColors = {
    success: colors.success,
    error: colors.error,
    warning: colors.warning,
    info: colors.accentOrange,
  };

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
        shadows.lg,
        animatedStyle,
      ]}
    >
      <Feather name={icons[type]} size={20} color={iconColors[type]} />
      <Text variant="bodySmall" style={styles.message}>
        {message}
      </Text>
    </Animated.View>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 9999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  message: {
    flex: 1,
    marginLeft: spacing.md,
  },
});
