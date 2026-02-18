import React, { memo, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Skeleton } from './Skeleton';

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

  const resolvedSource = useMemo(() => resolveSource(source), [source]);
  const resolvedFallback = useMemo(() => resolveSource(fallbackSource), [fallbackSource]);
  const activeSource = hasError && resolvedFallback ? resolvedFallback : resolvedSource;

  useEffect(() => {
    setHasError(false);
    setIsLoading(Boolean(resolveSource(source)));
  }, [source]);

  const handleLoadStart = () => {
    setIsLoading(true);
  };

  const handleLoadEnd = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    if (!hasError && resolvedFallback) {
      setHasError(true);
      return;
    }
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
      {isLoading ? (
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
});
