import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useRouter } from 'expo-router';
import Animated, {
  Easing,
  Extrapolate,
  FadeInDown,
  FadeOutUp,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '../theme/ThemeProvider';
import { useI18n } from '../services/i18n/i18n';
import { endpoints } from '../services/api/endpoints';
import { API_BASE_URL } from '../services/api/client';

import { Screen } from '../components/ui/Screen';
import { AppHeader } from '../components/ui/AppHeader';
import { BottomSheetModal } from '../components/ui/BottomSheetModal';
import { Card } from '../components/ui/Card';
import { Text } from '../components/ui/Text';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Divider } from '../components/ui/Divider';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { BackButton } from '../components/ui/BackButton';

import { MapPin, X, Filter, ChevronRight } from 'lucide-react-native';

import { ad, makeADTheme, pressableScaleConfig } from '../theme/academyDiscovery.styles';

function safeText(v) {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

function toAbsoluteUrlMaybe(url, base) {
  if (!url) return null;
  const s = String(url);
  if (s.startsWith('http://') || s.startsWith('https://')) return s;
  if (!base) return s;
  return `${base.replace(/\/$/, '')}/${s.replace(/^\//, '')}`;
}

function academyImageUrl(base, slug, kind) {
  if (!base || !slug) return null;
  // NOTE: your Template screen uses this same path pattern
  return `${base.replace(/\/$/, '')}/public/academies/image/${encodeURIComponent(slug)}/${kind}`;
}

function AnimatedPress({ children, disabled }) {
  const p = useSharedValue(0);

  const aStyle = useAnimatedStyle(() => {
    const s = interpolate(
      p.value,
      [0, 1],
      [pressableScaleConfig.from, pressableScaleConfig.to],
      Extrapolate.CLAMP
    );
    return { transform: [{ scale: s }] };
  }, []);

  const onIn = useCallback(() => {
    if (disabled) return;
    p.value = withTiming(1, {
      duration: pressableScaleConfig.in.duration,
      easing: Easing.out(Easing.quad),
    });
  }, [disabled, p]);

  const onOut = useCallback(() => {
    if (disabled) return;
    p.value = withTiming(0, {
      duration: pressableScaleConfig.out.duration,
      easing: Easing.out(Easing.quad),
    });
  }, [disabled, p]);

  // Touch wrapper so we don’t interfere with Button internal press logic
  return (
    <Animated.View style={aStyle} onTouchStart={onIn} onTouchEnd={onOut}>
      {children}
    </Animated.View>
  );
}

export function AcademyMapScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { t } = useI18n();

  const theme = useMemo(() => makeADTheme(colors, isDark), [colors, isDark]);

  const mapRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [items, setItems] = useState([]);

  // Filters (backend map endpoint supports sport/city)
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sport, setSport] = useState('');
  const [city, setCity] = useState('');

  const [selected, setSelected] = useState(null); // selected academy marker
  const [previewOpen, setPreviewOpen] = useState(false);

  const initialRegion = useMemo(() => {
    // Default: Amman-ish (safe fallback)
    return {
      latitude: 31.9539,
      longitude: 35.9106,
      latitudeDelta: 0.25,
      longitudeDelta: 0.25,
    };
  }, []);

  const fetchMap = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const res = await endpoints.publicAcademies.map({
        sport: sport || '',
        city: city || '',
      });
      const list = Array.isArray(res?.data) ? res.data : [];
      setItems(list);

      // Auto fit markers (nice pro touch)
      const points = list
        .map((x) => x?.academy || x)
        .filter((a) => a?.lat != null && a?.lng != null);

      if (points.length >= 2 && mapRef.current?.fitToCoordinates) {
        const coords = points.map((a) => ({ latitude: Number(a.lat), longitude: Number(a.lng) }));
        setTimeout(() => {
          mapRef.current?.fitToCoordinates(coords, {
            edgePadding: { top: 120, right: 60, bottom: 320, left: 60 },
            animated: true,
          });
        }, 250);
      }
    } catch (e) {
      setError(e?.message || t('common.error', 'Something went wrong'));
    } finally {
      setLoading(false);
    }
  }, [city, sport, t]);

  useEffect(() => {
    fetchMap();
  }, [fetchMap]);

  const normalizedAcademies = useMemo(() => {
    return items
      .map((x) => x?.academy || x)
      .filter((a) => a?.slug && a?.lat != null && a?.lng != null);
  }, [items]);

  const onSelect = useCallback((academy) => {
    setSelected(academy);
    setPreviewOpen(true);
  }, []);

  const onViewTemplate = useCallback(() => {
    const slug = selected?.slug;
    if (!slug) return;
    setPreviewOpen(false);
    router.push(`/academies/${slug}`);
  }, [router, selected]);

  const onJoin = useCallback(() => {
    const slug = selected?.slug;
    if (!slug) return;
    setPreviewOpen(false);
    router.push(`/academies/${slug}/join`);
  }, [router, selected]);

  const coverUri = useMemo(() => {
    if (!selected?.slug) return null;
    return (
      toAbsoluteUrlMaybe(selected?.cover_url, API_BASE_URL) ||
      academyImageUrl(API_BASE_URL, selected.slug, 'cover')
    );
  }, [selected]);

  const logoUri = useMemo(() => {
    if (!selected?.slug) return null;
    return (
      toAbsoluteUrlMaybe(selected?.logo_url, API_BASE_URL) ||
      academyImageUrl(API_BASE_URL, selected.slug, 'logo')
    );
  }, [selected]);

  // Motion: floating header entrance
  const headerEnter = useMemo(() => FadeInDown.duration(340).delay(40), []);

  // Glass surface (dynamic style #1)
  const glassBg = useMemo(
    () => (isDark ? 'rgba(11,18,32,0.72)' : 'rgba(248,250,252,0.78)'),
    [isDark]
  );

  // Compact state card bg (dynamic style #2)
  const stateBg = useMemo(
    () => (isDark ? 'rgba(15,23,42,0.80)' : 'rgba(255,255,255,0.86)'),
    [isDark]
  );

  // Header “lift” when preview is open (subtle connected feel)
  const lift = useSharedValue(0);
  useEffect(() => {
    lift.value = withTiming(previewOpen ? 1 : 0, { duration: 220, easing: Easing.out(Easing.quad) });
  }, [previewOpen, lift]);

  const headerLiftStyle = useAnimatedStyle(() => {
    const y = interpolate(lift.value, [0, 1], [0, -6], Extrapolate.CLAMP);
    return { transform: [{ translateY: y }] };
  }, []);

  return (
    <Screen safe scroll={false} style={ad.screen(theme)}>
      <View style={styles.mapWrap}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={initialRegion}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          showsUserLocation={false}
          showsMyLocationButton={false}
        >
          {normalizedAcademies.map((a) => (
            <Marker
              key={a.slug}
              coordinate={{ latitude: Number(a.lat), longitude: Number(a.lng) }}
              title={safeText(a.name_en || a.name_ar || a.name)}
              description={safeText(a.city)}
              onPress={() => onSelect(a)}
            />
          ))}
        </MapView>

        {/* Floating header overlay (map is the hero) */}
        <Animated.View
          entering={headerEnter}
          style={[
            styles.headerOverlay,
            theme.shadow.md,
            { backgroundColor: glassBg, borderColor: theme.hairline }, // dynamic #3/#4
            headerLiftStyle,
          ]}
        >
          <View style={styles.headerInner}>
            <AppHeader
              title={t('academies.map.title', 'Academies map')}
              subtitle={t('academies.map.subtitle', 'Explore nearby academies and open the template in one tap.')}
              leftSlot={<BackButton color={colors.textPrimary} />}
              rightAction={{
                icon: <Filter size={20} color={colors.textPrimary} />,
                onPress: () => setFiltersOpen(true),
                accessibilityLabel: t('academies.filters.open', 'Filters'),
              }}
            />
          </View>
        </Animated.View>

        {/* Compact floating states (not heavy overlays) */}
        {loading ? (
          <Animated.View
            entering={FadeInDown.duration(220).delay(60)}
            exiting={FadeOutUp.duration(160)}
            style={[styles.stateFloat, theme.shadow.md, { backgroundColor: stateBg, borderColor: theme.hairline }]}
          >
            <Text weight="bold" style={{ color: theme.text.primary }}>
              {t('common.loading', 'Loading')}…
            </Text>
            <Text variant="caption" color={theme.text.secondary} style={{ marginTop: 6 }}>
              {t('academies.map.loadingSub', 'Fetching academies for the map…')}
            </Text>
          </Animated.View>
        ) : error ? (
          <Animated.View
            entering={FadeInDown.duration(220).delay(40)}
            style={[styles.stateWide, theme.shadow.md, { backgroundColor: stateBg, borderColor: theme.hairline }]}
          >
            <ErrorState
              title={t('common.error', 'Error')}
              message={error}
              actionLabel={t('common.tryAgain', 'Try again')}
              onAction={fetchMap}
            />
          </Animated.View>
        ) : normalizedAcademies.length === 0 ? (
          <Animated.View
            entering={FadeInDown.duration(220).delay(40)}
            style={[styles.stateWide, theme.shadow.md, { backgroundColor: stateBg, borderColor: theme.hairline }]}
          >
            <EmptyState
              title={t('academies.map.emptyTitle', 'No academies on map')}
              message={t('academies.map.emptySub', 'Try removing filters to see more results.')}
              actionLabel={t('common.reset', 'Reset')}
              onAction={() => {
                setSport('');
                setCity('');
                fetchMap();
              }}
            />
          </Animated.View>
        ) : null}
      </View>

      {/* Filters sheet (same behavior; DS styles) */}
      <BottomSheetModal visible={filtersOpen} onClose={() => setFiltersOpen(false)}>
        <View style={ad.sheetWrap(theme)}>
          <View style={ad.sheetHandle(theme)} />

          <View style={ad.sheetHeader(theme)}>
            <View style={ad.sheetHeaderLeft()}>
              <Text variant="h4" weight="bold" style={{ color: theme.text.primary }}>
                {t('academies.filters.title', 'Smart filters')}
              </Text>
              <Text variant="caption" color={theme.text.secondary}>
                {t('academies.map.filtersSub', 'Filters affect what appears on the map.')}
              </Text>
            </View>

            <Button variant="ghost" onPress={() => setFiltersOpen(false)} style={ad.sheetCloseBtn()}>
              <X size={18} color={theme.text.primary} />
            </Button>
          </View>

          <View style={[ad.sheetBody(theme), { marginTop: theme.space.lg }]}>
            <Input
              label={t('academies.sport', 'Sport')}
              value={sport}
              onChangeText={setSport}
              placeholder="e.g. Football"
            />
            <Input
              label={t('academies.city', 'City')}
              value={city}
              onChangeText={setCity}
              placeholder="e.g. Amman"
            />

            <Divider />

            <View style={ad.sheetActionsRow(theme)}>
              <AnimatedPress>
                <Button
                  variant="secondary"
                  style={ad.sheetActionBtn()}
                  onPress={() => {
                    setSport('');
                    setCity('');
                  }}
                >
                  <Text variant="caption" weight="bold" style={{ color: theme.text.primary }}>
                    {t('common.reset', 'Reset')}
                  </Text>
                </Button>
              </AnimatedPress>

              <AnimatedPress>
                <Button
                  style={ad.sheetActionBtn()}
                  onPress={async () => {
                    setFiltersOpen(false);
                    await fetchMap();
                  }}
                >
                  <Text variant="caption" weight="bold" style={{ color: theme.text.onDark }}>
                    {t('common.apply', 'Apply')}
                  </Text>
                </Button>
              </AnimatedPress>
            </View>
          </View>
        </View>
      </BottomSheetModal>

      {/* Preview sheet (rich, connected, motion) */}
      <BottomSheetModal visible={previewOpen} onClose={() => setPreviewOpen(false)}>
        <Animated.View
          entering={withDelay(40, FadeInDown.duration(260))}
          style={[ad.sheetWrap(theme), { paddingTop: theme.space.md }]}
        >
          <View style={ad.sheetHeader(theme)}>
            <View style={ad.sheetHeaderLeft()}>
              <Text variant="caption" color={theme.text.muted} style={{ marginBottom: 6 }}>
                {t('academies.map.previewHint', 'Open the full template or join directly.')}
              </Text>

              <Text variant="h4" weight="bold" numberOfLines={1} style={{ color: theme.text.primary }}>
                {safeText(selected?.name_en || selected?.name_ar || selected?.name) || t('academies.unnamed', 'Academy')}
              </Text>

              <Text variant="caption" color={theme.text.secondary} numberOfLines={1}>
                {safeText(selected?.city)}
                {safeText(selected?.address) ? ` • ${safeText(selected.address)}` : ''}
              </Text>
            </View>

            <Button variant="ghost" onPress={() => setPreviewOpen(false)} style={ad.sheetCloseBtn()}>
              <X size={18} color={theme.text.primary} />
            </Button>
          </View>

          {/* Rich preview card */}
          <Card
            style={[
              styles.previewCard,
              theme.shadow.md,
              { backgroundColor: theme.surface2, borderColor: theme.hairline },
            ]}
          >
            <View style={styles.previewTopRow}>
              <View
                style={[
                  styles.previewIcon,
                  { backgroundColor: theme.accent.orangeSoft, borderColor: theme.accent.orangeHair },
                ]}
              >
                <MapPin size={18} color={theme.accent.orange} />
              </View>

              <View style={{ flex: 1, minWidth: 0 }}>
                <Text variant="caption" color={theme.text.muted} numberOfLines={1}>
                  {t('academies.map.previewConnected', 'Selected on map')}
                </Text>
                <Text weight="bold" numberOfLines={1} style={{ color: theme.text.primary, marginTop: 2 }}>
                  {safeText(selected?.name_en || selected?.name_ar || selected?.name) || t('academies.unnamed', 'Academy')}
                </Text>
              </View>
            </View>

            <View style={styles.previewActions}>
              <AnimatedPress>
                <Button variant="secondary" style={{ flex: 1 }} onPress={onViewTemplate}>
                  <View style={styles.btnRow}>
                    <Text variant="caption" weight="bold" style={{ color: theme.text.primary }}>
                      {t('academies.view', 'View')}
                    </Text>
                    <ChevronRight size={14} color={theme.text.primary} />
                  </View>
                </Button>
              </AnimatedPress>

              <AnimatedPress>
                <Button style={{ flex: 1 }} onPress={onJoin}>
                  <Text variant="caption" weight="bold" style={{ color: theme.text.onDark }}>
                    {t('academies.joinNow', 'Join')}
                  </Text>
                </Button>
              </AnimatedPress>
            </View>
          </Card>

          {/* coverUri/logoUri kept computed for future enhancements (thumbnail) */}
          {/* coverUri: {coverUri}  logoUri: {logoUri} */}
        </Animated.View>
      </BottomSheetModal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  mapWrap: {
    flex: 1,
  },

  // Floating glass header overlay
  headerOverlay: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: 10,
    borderWidth: 1,
    borderRadius: 20,
    overflow: 'hidden',
  },
  headerInner: {
    paddingHorizontal: 4,
    paddingBottom: 6,
  },

  // Compact state cards
  stateFloat: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: 118,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
  },

  stateWide: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: 118,
    borderWidth: 1,
    borderRadius: 18,
    padding: 10,
  },

  // Preview
  previewCard: {
    borderWidth: 1,
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: 10,
  },
  previewTopRow: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  previewIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  previewActions: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    gap: 12,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});
