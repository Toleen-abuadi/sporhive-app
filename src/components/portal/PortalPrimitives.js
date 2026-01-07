// src/components/portal/PortalPrimitives.js
import React, { memo, useMemo } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useTheme } from '../../theme/ThemeProvider';
import { portalStyles, portalTokens } from '../../theme/portal.styles';

const asDataUri = (base64) => {
  if (!base64) return null;
  if (base64.startsWith('data:')) return base64;
  return `data:image/jpeg;base64,${base64}`;
};

export const PortalScreen = ({ children }) => {
  const { theme } = useTheme();
  return (
    <View style={[portalStyles.screen, { backgroundColor: theme?.colors?.background ?? portalTokens.colors.bg }]}>
      {children}
    </View>
  );
};

export const PortalHeader = memo(function PortalHeader({ title, subtitle, right }) {
  return (
    <Animated.View entering={FadeInDown.duration(260)} style={portalStyles.header}>
      <View style={{ flex: 1 }}>
        <Text style={portalStyles.h1}>{title}</Text>
        {!!subtitle && <Text style={portalStyles.muted}>{subtitle}</Text>}
      </View>
      {!!right && <View>{right}</View>}
    </Animated.View>
  );
});

export const Hero = memo(function Hero({ name, academyName, imageBase64, badgeText }) {
  const img = useMemo(() => asDataUri(imageBase64), [imageBase64]);

  return (
    <Animated.View entering={FadeInUp.duration(260)} style={portalStyles.heroCard}>
      <View style={portalStyles.heroRow}>
        <View style={portalStyles.avatarWrap}>
          {img ? (
            <Image source={{ uri: img }} style={portalStyles.avatarImg} />
          ) : (
            <View style={portalStyles.avatarFallback}>
              <Text style={portalStyles.avatarFallbackText}>{(name || '?').slice(0, 1).toUpperCase()}</Text>
            </View>
          )}
        </View>

        <View style={{ flex: 1 }}>
          <Text style={portalStyles.heroName} numberOfLines={1}>
            {name || '—'}
          </Text>
          {!!academyName && (
            <Text style={portalStyles.heroSub} numberOfLines={1}>
              {academyName}
            </Text>
          )}
          {!!badgeText && (
            <View style={portalStyles.badgePill}>
              <Text style={portalStyles.badgePillText}>{badgeText}</Text>
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );
});

export const Card = memo(function Card({ children, style }) {
  return <View style={[portalStyles.card, style]}>{children}</View>;
});

export const Section = memo(function Section({ title, right, children }) {
  return (
    <View style={{ marginTop: 14 }}>
      <View style={portalStyles.sectionHeader}>
        <Text style={portalStyles.sectionTitle}>{title}</Text>
        {!!right && <View>{right}</View>}
      </View>
      {children}
    </View>
  );
});

export const Pill = memo(function Pill({ label, tone = 'neutral' }) {
  const s = portalStyles.pillByTone?.[tone] ?? portalStyles.pillNeutral;
  return (
    <View style={[portalStyles.pill, s]}>
      <Text style={portalStyles.pillText}>{label}</Text>
    </View>
  );
});

export const PrimaryButton = memo(function PrimaryButton({ title, onPress, disabled }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        portalStyles.primaryBtn,
        disabled && { opacity: 0.55 },
        pressed && !disabled && portalStyles.pressed,
      ]}
    >
      <Text style={portalStyles.primaryBtnText}>{title}</Text>
    </Pressable>
  );
});

export const GhostButton = memo(function GhostButton({ title, onPress, disabled }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        portalStyles.ghostBtn,
        disabled && { opacity: 0.55 },
        pressed && !disabled && portalStyles.pressed,
      ]}
    >
      <Text style={portalStyles.ghostBtnText}>{title}</Text>
    </Pressable>
  );
});

export const ErrorBanner = memo(function ErrorBanner({ title, desc, onRetry }) {
  return (
    <View style={portalStyles.errorBanner}>
      <View style={{ flex: 1 }}>
        <Text style={portalStyles.errorTitle}>{title || 'Something went wrong'}</Text>
        {!!desc && <Text style={portalStyles.errorDesc}>{desc}</Text>}
      </View>
      {!!onRetry && (
        <Pressable onPress={onRetry} style={({ pressed }) => [portalStyles.retryBtn, pressed && portalStyles.pressed]}>
          <Text style={portalStyles.retryBtnText}>Retry</Text>
        </Pressable>
      )}
    </View>
  );
});

export const SkeletonBlock = memo(function SkeletonBlock({ h = 14, w = '100%', r = 10, style }) {
  return <View style={[portalStyles.skeleton, { height: h, width: w, borderRadius: r }, style]} />;
});
