import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { usePathname, useRouter, useSegments } from 'expo-router';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../services/auth/auth.store';
import { useTranslation } from '../../services/i18n/i18n';
import { useTheme } from '../../theme/ThemeProvider';
import { borderRadius, shadow, spacing } from '../../theme/tokens';
import {
  BOTTOM_NAV_FLOAT_OFFSET,
  getBottomNavActiveKey,
  isBottomNavRoute,
} from '../../navigation/bottomNav';
import { Icon } from '../ui/Icon';
import { Text } from '../ui/Text';

const TAB_ICON_MAP = {
  home: 'home',
  discover: 'compass',
  book: 'calendar',
  portal: 'grid',
  profile: 'user',
};

const TAB_ROUTES = {
  home: '/(app)/services',
  discover: '/academies',
  book: '/playgrounds/explore',
  portal: '/portal/home',
  profile: '/portal/profile',
};

export function AppBottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { t, isRTL } = useTranslation();
  const { userType } = useAuth();

  const isVisible = useMemo(
    () => isBottomNavRoute({ segments, pathname }),
    [pathname, segments],
  );

  const activeKey = useMemo(
    () => getBottomNavActiveKey({ segments, pathname }),
    [pathname, segments],
  );

  const tabs = useMemo(
    () => [
      { key: 'home', label: t('nav.home') },
      { key: 'discover', label: t('nav.discover') },
      { key: 'book', label: t('nav.book') },
      { key: 'portal', label: t('nav.portal') },
      { key: 'profile', label: t('nav.profile') },
    ],
    [t],
  );

  const orderedTabs = useMemo(
    () => (isRTL ? [...tabs].reverse() : tabs),
    [isRTL, tabs],
  );

  if (!isVisible) return null;

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.outer,
        {
          bottom: insets.bottom + BOTTOM_NAV_FLOAT_OFFSET,
        },
      ]}
    >
      <BlurView intensity={40} tint={isDark ? 'dark' : 'light'} style={styles.blurWrap}>
        <LinearGradient
          colors={[`${colors.surface}F8`, `${colors.surface}EE`]}
          style={[styles.inner, { borderColor: colors.border }]}
        >
          <View style={[styles.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            {orderedTabs.map((tab) => {
              const isActive = activeKey === tab.key;
              const route = TAB_ROUTES[tab.key];
              const isPortalTab = tab.key === 'portal' || tab.key === 'profile';
              const target =
                isPortalTab && userType !== 'player'
                  ? `/(auth)/login?mode=player&lockMode=1&redirectTo=${encodeURIComponent(route)}`
                  : route;

              return (
                <Pressable
                  key={tab.key}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
                  accessibilityLabel={tab.label}
                  onPress={() => {
                    if (!target) return;
                    if (isActive && !target.includes('redirectTo=')) return;
                    router.replace(target);
                  }}
                  style={({ pressed }) => [
                    styles.tab,
                    {
                      opacity: pressed ? 0.78 : 1,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.badge,
                      isActive
                        ? { backgroundColor: `${colors.accentOrange}22` }
                        : null,
                    ]}
                  >
                    <Icon
                      name={TAB_ICON_MAP[tab.key]}
                      size={18}
                      color={isActive ? colors.accentOrange : colors.textMuted}
                    />
                  </View>
                  <Text
                    variant="caption"
                    weight={isActive ? 'semibold' : 'normal'}
                    color={isActive ? colors.textPrimary : colors.textMuted}
                    style={styles.label}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </LinearGradient>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
  },
  blurWrap: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  inner: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    ...shadow.md,
  },
  row: {
    alignItems: 'center',
  },
  tab: {
    flex: 1,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  badge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    textAlign: 'center',
  },
});
