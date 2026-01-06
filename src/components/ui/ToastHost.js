// src/components/ui/ToastHost.js
import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing, borderRadius, shadows } from '../../theme/tokens';
import { Text } from './Text';

const ToastContext = createContext(null);

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message, type = 'info', options = {}) => {
    const id = makeId();
    const duration = clamp(Number(options.duration ?? 3200), 1500, 9000);
    const title = options.title || '';
    const actionLabel = options.actionLabel || '';
    const onAction = typeof options.onAction === 'function' ? options.onAction : null;

    setToasts((prev) => [
      ...prev,
      {
        id,
        message: String(message || ''),
        title: String(title || ''),
        type,
        duration,
        actionLabel: String(actionLabel || ''),
        onAction,
      },
    ]);

    // auto-remove
    const timeout = setTimeout(() => remove(id), duration);
    return () => clearTimeout(timeout);
  }, [remove]);

  const api = useMemo(
    () => ({
      success: (msg, opts) => showToast(msg, 'success', opts),
      error: (msg, opts) => showToast(msg, 'error', opts),
      warning: (msg, opts) => showToast(msg, 'warning', opts),
      info: (msg, opts) => showToast(msg, 'info', opts),
      show: showToast,
      remove,
      clear: () => setToasts([]),
    }),
    [remove, showToast]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastContainer toasts={toasts} onRemove={remove} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, onRemove }) {
  return (
    <View style={styles.container} pointerEvents="box-none">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onRemove={onRemove} />
      ))}
    </View>
  );
}

function ToastItem({ toast, onRemove }) {
  const { colors, isDark } = useTheme();

  const translateY = useRef(new Animated.Value(-18)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(1)).current;
  const panX = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, damping: 18, stiffness: 220, useNativeDriver: true }),
      Animated.timing(progress, {
        toValue: 0,
        duration: toast.duration,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
    ]).start();

    return () => {};
  }, [opacity, translateY, progress, toast.duration]);

  const icons = {
    success: 'check-circle',
    error: 'x-circle',
    warning: 'alert-triangle',
    info: 'info',
  };

  const accent = {
    success: colors.success,
    error: colors.error,
    warning: colors.warning,
    info: colors.accentOrange,
  }[toast.type] || colors.accentOrange;

  const bg = isDark ? 'rgba(16,16,18,0.92)' : 'rgba(255,255,255,0.92)';
  const border = isDark ? 'rgba(255,255,255,0.10)' : colors.border;

  const dismiss = useCallback(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 140, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: -10, duration: 140, useNativeDriver: true }),
    ]).start(() => onRemove(toast.id));
  }, [onRemove, opacity, toast.id, translateY]);

  const onActionPress = useCallback(() => {
    try {
      toast.onAction?.();
    } finally {
      dismiss();
    }
  }, [dismiss, toast]);

  // Swipe-to-dismiss (simple + reliable)
  const startX = useRef(0);
  const onTouchStart = (e) => (startX.current = e?.nativeEvent?.pageX ?? 0);
  const onTouchMove = (e) => {
    const x = (e?.nativeEvent?.pageX ?? 0) - startX.current;
    panX.setValue(clamp(x, -120, 120));
  };
  const onTouchEnd = () => {
    panX.stopAnimation((v) => {
      if (Math.abs(v) > 80) dismiss();
      else Animated.spring(panX, { toValue: 0, damping: 18, stiffness: 240, useNativeDriver: true }).start();
    });
  };

  const widthInterpolate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          backgroundColor: bg,
          borderColor: border,
          transform: [{ translateY }, { translateX: panX }],
          opacity,
        },
        shadows.lg,
      ]}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Accent bar */}
      <View style={[styles.accent, { backgroundColor: accent }]} />

      <View style={styles.body}>
        <View style={[styles.iconWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
          <Feather name={icons[toast.type] || 'info'} size={18} color={accent} />
        </View>

        <View style={{ flex: 1 }}>
          {!!toast.title && (
            <Text weight="bold" variant="bodySmall" style={{ marginBottom: 3 }}>
              {toast.title}
            </Text>
          )}
          <Text variant="bodySmall" style={{ color: colors.textSecondary }}>
            {toast.message}
          </Text>

          {!!toast.actionLabel && !!toast.onAction && (
            <Pressable onPress={onActionPress} style={({ pressed }) => [{ marginTop: 10, opacity: pressed ? 0.75 : 1 }]}>
              <Text weight="bold" variant="caption" style={{ color: accent }}>
                {toast.actionLabel}
              </Text>
            </Pressable>
          )}
        </View>

        <Pressable onPress={dismiss} style={({ pressed }) => [styles.closeBtn, { opacity: pressed ? 0.7 : 1 }]}>
          <Feather name="x" size={16} color={colors.textSecondary} />
        </Pressable>
      </View>

      {/* Progress bar */}
      <View style={[styles.progressTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
        <Animated.View style={[styles.progressFill, { backgroundColor: accent, width: widthInterpolate }]} />
      </View>
    </Animated.View>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 58 : 48,
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 9999,
  },
  toast: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  accent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  body: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.lg,
    gap: spacing.md,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: {
    height: 3,
    width: '100%',
  },
  progressFill: {
    height: '100%',
  },
});
