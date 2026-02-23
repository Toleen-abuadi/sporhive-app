import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';
import { ImageOff } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Skeleton } from './Skeleton';

const LOAD_TIMEOUT_MS = 12000;

const resolveSource = (source) => {
  if (!source) return null;

  if (typeof source === 'number') {
    return source;
  }

  if (typeof source === 'string') {
    const value = source.trim();
    return value ? { uri: value } : null;
  }

  if (typeof source === 'object') {
    if (typeof source.uri === 'string' && source.uri.trim()) {
      return { uri: source.uri };
    }
    if (typeof source.default === 'number') {
      return source.default;
    }
  }

  return null;
};

export const SmartImage = memo(function SmartImage({
  source,
  fallbackSource = null,
  style,
  imageStyle,
  borderRadius = 0,
  placeholderColor,
  showLoader = true,
  showSkeleton = true,
  skeletonMode,
  accessibilityLabel,
}) {
  const { colors, isDark } = useTheme();
  const [isLoading, setIsLoading] = useState(Boolean(resolveSource(source)));
  const [hasError, setHasError] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const loadTimeoutRef = useRef(null);

  const resolvedSource = useMemo(() => resolveSource(source), [source]);
  const resolvedFallback = useMemo(() => resolveSource(fallbackSource), [fallbackSource]);
  const activeSource = hasError && resolvedFallback ? resolvedFallback : resolvedSource;

  useEffect(() => {
    setHasError(false);
    setShowFallback(false);
    setIsLoading(Boolean(resolvedSource));
  }, [resolvedSource]);

  useEffect(() => {
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }
    if (!isLoading) return undefined;

    loadTimeoutRef.current = setTimeout(() => {
      setShowFallback(true);
      setIsLoading(false);
    }, LOAD_TIMEOUT_MS);

    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = null;
      }
    };
  }, [isLoading, activeSource]);

  const handleLoadStart = () => {
    setShowFallback(false);
    setIsLoading(true);
  };

  const handleLoadEnd = () => {
    setShowFallback(false);
    setIsLoading(false);
  };

  const handleError = () => {
    if (!hasError && resolvedFallback) {
      setHasError(true);
      setShowFallback(false);
      return;
    }
    setShowFallback(true);
    setIsLoading(false);
  };

  return (
    <View
      style={[
        styles.container,
        {
          borderRadius,
          backgroundColor: placeholderColor || colors.surfaceElevated || colors.surface,
        },
        style,
      ]}
      accessibilityLabel={accessibilityLabel}
    >
      {activeSource ? (
        <Image
          source={activeSource}
          resizeMode="cover"
          style={[StyleSheet.absoluteFillObject, imageStyle]}
          onLoadStart={handleLoadStart}
          onLoadEnd={handleLoadEnd}
          onError={handleError}
        />
      ) : null}
      {isLoading && !showFallback ? (
        <View style={styles.loaderLayer} pointerEvents="none">
          {showSkeleton ? (
            <Skeleton
              width="100%"
              height="100%"
              radius={borderRadius}
              mode={skeletonMode || (isDark ? 'dark' : 'light')}
              style={StyleSheet.absoluteFillObject}
            />
          ) : null}
          {showLoader ? <ActivityIndicator size="small" color={colors.accentOrange} /> : null}
        </View>
      ) : null}
      {showFallback ? (
        <View style={[styles.fallbackLayer, { backgroundColor: placeholderColor || colors.surface }]}>
          <ImageOff size={18} color={colors.textMuted || colors.textSecondary} />
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  loaderLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
