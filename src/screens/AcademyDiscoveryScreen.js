import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Keyboard, RefreshControl, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  Easing,
  Extrapolate,
  FadeInDown,
  FadeOutUp,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '../theme/ThemeProvider';
import { useI18n } from '../services/i18n/i18n';
import { Screen } from '../components/ui/Screen';
import { AppHeader } from '../components/ui/AppHeader';
import { Input } from '../components/ui/Input';
import { Text } from '../components/ui/Text';
import { Chip } from '../components/ui/Chip';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { BottomSheetModal } from '../components/ui/BottomSheetModal';
import { Button } from '../components/ui/Button';
import { Divider } from '../components/ui/Divider';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { AcademyCard } from '../components/discovery/AcademyCard';
import { endpoints } from '../services/api/endpoints';
import { API_BASE_URL } from '../services/api/client';
import { Filter, Search, SlidersHorizontal, Navigation, Sparkles, Star, X } from 'lucide-react-native';

import { ad, makeADTheme, pressableScaleConfig, chipStyles } from '../theme/academyDiscovery.styles';

function useDebouncedValue(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

const PAGE_SIZE = 10;
const STAGGER_COUNT = 7;

function AnimatedPress({ children, disabled }) {
  const p = useSharedValue(0);

  const style = useAnimatedStyle(() => {
    const s = interpolate(p.value, [0, 1], [pressableScaleConfig.from, pressableScaleConfig.to], Extrapolate.CLAMP);
    return { transform: [{ scale: s }] };
  }, []);

  const pressIn = useCallback(() => {
    if (disabled) return;
    p.value = withTiming(1, {
      duration: pressableScaleConfig.in.duration,
      easing: Easing.out(Easing.quad),
    });
  }, [disabled, p]);

  const pressOut = useCallback(() => {
    if (disabled) return;
    p.value = withTiming(0, {
      duration: pressableScaleConfig.out.duration,
      easing: Easing.out(Easing.quad),
    });
  }, [disabled, p]);

  // Touch wrapper so we don't break internal Pressables inside AcademyCard
  return (
    <Animated.View style={style} onTouchStart={pressIn} onTouchEnd={pressOut}>
      {children}
    </Animated.View>
  );
}

function StaggerWrap({ index, theme, children }) {
  const entering =
    index < STAGGER_COUNT
      ? FadeInDown.duration(420).delay(90 + index * 70)
      : FadeInDown.duration(260);

  const wrapStyle = index < 2 ? ad.featuredWrap(theme) : null;

  return (
    <Animated.View entering={entering} exiting={FadeOutUp.duration(160)} style={wrapStyle}>
      {children}
    </Animated.View>
  );
}

export function AcademyDiscoveryScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { t } = useI18n();

  const theme = useMemo(() => makeADTheme(colors, isDark), [colors, isDark]);
  const chip = useMemo(() => chipStyles(theme), [theme]);

  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, 400);

  const [sport, setSport] = useState('');
  const [city, setCity] = useState('');
  const [ageFrom, setAgeFrom] = useState('');
  const [ageTo, setAgeTo] = useState('');
  const [registrationEnabled, setRegistrationEnabled] = useState(false);
  const [proOnly, setProOnly] = useState(false);

  const [sort, setSort] = useState('recommended'); // recommended | newest | nearest
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [coords, setCoords] = useState(null);
  const [locationStatus, setLocationStatus] = useState('idle'); // idle | asking | granted | denied | error

  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  const loadMoreLock = useRef(false);

  const sortOptions = useMemo(() => {
    return [
      {
        value: 'recommended',
        label: t('academies.sort.recommended', 'Recommended'),
        icon: (active, c) => <Sparkles size={16} color={active ? c.accentOrange : c.textMuted} />,
      },
      {
        value: 'newest',
        label: t('academies.sort.newest', 'Newest'),
        icon: (active, c) => <Star size={16} color={active ? c.accentOrange : c.textMuted} />,
      },
      {
        value: 'nearest',
        label: t('academies.sort.nearest', 'Nearest'),
        icon: (active, c) => <Navigation size={16} color={active ? c.accentOrange : c.textMuted} />,
      },
    ];
  }, [t]);

  const requestLocation = useCallback(() => {
    if (!global?.navigator?.geolocation?.getCurrentPosition) {
      setLocationStatus('error');
      return;
    }
    setLocationStatus('asking');

    global.navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationStatus('granted');
      },
      () => {
        setLocationStatus('denied');
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60_000 }
    );
  }, []);

  const buildBody = useCallback(
    (pageNum) => {
      const body = {
        q: debouncedQuery || '',
        sport: sport || '',
        city: city || '',
        age_from: ageFrom || '',
        age_to: ageTo || '',
        registration_enabled: registrationEnabled ? true : undefined,
        is_pro: proOnly ? true : undefined,
        sort: sort,
        page: pageNum,
        page_size: PAGE_SIZE,
      };

      if (sort === 'nearest' && coords?.lat && coords?.lng) {
        body.lat = coords.lat;
        body.lng = coords.lng;
      }
      return body;
    },
    [ageFrom, ageTo, city, coords, debouncedQuery, proOnly, registrationEnabled, sort, sport]
  );

  const fetchPage = useCallback(
    async (pageNum, { append } = { append: false }) => {
      setError('');
      const isFirst = pageNum === 1 && !append;

      if (isFirst) setLoading(true);
      else setLoadingMore(true);

      try {
        if (sort === 'nearest' && !coords && locationStatus === 'idle') requestLocation();

        const res = await endpoints.publicAcademies.list(buildBody(pageNum));
        const list = Array.isArray(res?.data) ? res.data : [];
        setHasMore(list.length >= PAGE_SIZE);

        setItems((prev) => (append ? [...prev, ...list] : list));
        if (isFirst) setPage(1);
      } catch (e) {
        setError(e?.message || t('common.error', 'Something went wrong'));
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [buildBody, coords, locationStatus, requestLocation, sort, t]
  );

  // auto refresh when filters change (debounced)
  useEffect(() => {
    fetchPage(1, { append: false });
  }, [debouncedQuery, sport, city, ageFrom, ageTo, registrationEnabled, proOnly, sort, coords, fetchPage]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchPage(1, { append: false });
    } finally {
      setRefreshing(false);
    }
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || refreshing || !hasMore || error) return;
    if (loadMoreLock.current) return;
    loadMoreLock.current = true;
    try {
      const next = page + 1;
      setPage(next);
      await fetchPage(next, { append: true });
    } finally {
      loadMoreLock.current = false;
    }
  }, [error, fetchPage, hasMore, loading, loadingMore, page, refreshing]);

  const onView = useCallback(
    (academy) => {
      const slug = academy?.slug;
      if (slug) router.push(`/academies/${slug}`);
    },
    [router]
  );

  const onJoin = useCallback(
    (academy) => {
      const slug = academy?.slug;
      if (slug) router.push(`/academies/${slug}/join`);
    },
    [router]
  );

  const clearAll = useCallback(() => {
    Keyboard.dismiss();
    setQuery('');
    setSport('');
    setCity('');
    setAgeFrom('');
    setAgeTo('');
    setRegistrationEnabled(false);
    setProOnly(false);
    setSort('recommended');
  }, []);

  const activeChips = useMemo(() => {
    const out = [];
    if (debouncedQuery) out.push({ key: 'q', label: `${t('common.search', 'Search')}: ${debouncedQuery}` });
    if (sport) out.push({ key: 'sport', label: `${t('academies.sport', 'Sport')}: ${sport}` });
    if (city) out.push({ key: 'city', label: `${t('academies.city', 'City')}: ${city}` });
    if (ageFrom || ageTo) out.push({ key: 'age', label: `${t('academies.ages', 'Ages')}: ${ageFrom || '—'}-${ageTo || '—'}` });
    if (registrationEnabled) out.push({ key: 'reg', label: t('academies.filter.registrationEnabled', 'Registration enabled') });
    if (proOnly) out.push({ key: 'pro', label: t('academies.filter.proOnly', 'PRO only') });
    if (sort && sort !== 'recommended') out.push({ key: 'sort', label: `${t('common.sort', 'Sort')}: ${sort}` });
    return out;
  }, [ageFrom, ageTo, city, debouncedQuery, proOnly, registrationEnabled, sort, sport, t]);

  const removeChip = useCallback((key) => {
    if (key === 'q') setQuery('');
    if (key === 'sport') setSport('');
    if (key === 'city') setCity('');
    if (key === 'age') {
      setAgeFrom('');
      setAgeTo('');
    }
    if (key === 'reg') setRegistrationEnabled(false);
    if (key === 'pro') setProOnly(false);
    if (key === 'sort') setSort('recommended');
  }, []);

  const renderChip = useCallback(
    ({ item }) => (
      <Chip
        label={item.label}
        selected
        onPress={() => removeChip(item.key)}
        rightIcon={<X size={14} color={colors.accentOrange} />}
        style={chip.pill}
        textStyle={chip.text}
      />
    ),
    [chip.pill, chip.text, colors.accentOrange, removeChip]
  );

  // Sticky header feel (subtle border intensifies as you scroll)
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });

  const headerSurfaceA = useAnimatedStyle(() => {
    const borderBoost = interpolate(scrollY.value, [0, 28], [0.7, 1], Extrapolate.CLAMP);
    const opacityBoost = interpolate(scrollY.value, [0, 28], [1, 1], Extrapolate.CLAMP);

    // inline dynamic styles limit: this is 1 of max 5, and only uses colors from theme
    return {
      opacity: opacityBoost,
      borderBottomColor: theme.isDark
        ? `rgba(255,255,255,${0.08 * borderBoost})`
        : `rgba(0,0,0,${0.06 * borderBoost})`,
    };
  }, [theme.isDark]);

  const header = useMemo(() => {
    return (
      <Animated.View style={[ad.headerWrap(theme), headerSurfaceA]}>
        <View style={ad.headerInner(theme)}>
          <AppHeader
            title={t('academies.discovery.title', 'Discover academies')}
            subtitle={t('academies.discovery.subtitle', 'Filter, compare, then join in a few taps.')}
            rightAction={{
              icon: <SlidersHorizontal size={20} color={colors.textPrimary} />,
              onPress: () => setFiltersOpen(true),
              accessibilityLabel: t('academies.filters.open', 'Filters'),
            }}
          />

          <View style={ad.actionRow(theme)}>
            <Button
              variant="secondary"
              style={ad.actionBtn()}
              onPress={() => router.push('/academies/map')}
            >
              <Navigation size={16} color={colors.textPrimary} />
              <Text variant="caption" weight="bold" style={{ color: colors.textPrimary }}>
                {' '}
                {t('academies.map.open', 'Map')}
              </Text>
            </Button>

            <Button style={ad.actionBtn()} onPress={() => setFiltersOpen(true)}>
              <SlidersHorizontal size={16} color={colors.white} />
              <Text variant="caption" weight="bold" style={{ color: colors.white }}>
                {' '}
                {t('academies.filters.open', 'Filters')}
              </Text>
            </Button>
          </View>

          <View style={ad.searchWrap(theme)}>
            <Input
              value={query}
              onChangeText={setQuery}
              placeholder={t('academies.searchPlaceholder', 'Search academies…')}
              leftIcon={<Search size={18} color={colors.textMuted} />}
              returnKeyType="search"
            />
          </View>

          <View style={ad.sortWrap(theme)}>
            <SegmentedControl value={sort} onChange={setSort} options={sortOptions} />
          </View>

          {activeChips.length ? (
            <FlatList
              data={activeChips}
              keyExtractor={(x) => x.key}
              renderItem={renderChip}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={ad.chipsContent(theme)}
            />
          ) : (
            <View style={ad.chipsSpacer(theme)} />
          )}

          <Divider />
        </View>
      </Animated.View>
    );
  }, [
    activeChips,
    colors.textMuted,
    colors.textPrimary,
    colors.white,
    headerSurfaceA,
    query,
    renderChip,
    router,
    setSort,
    sort,
    sortOptions,
    t,
    theme,
  ]);

  const listEmpty = useCallback(() => {
    if (loading) return null;
    if (error) {
      return (
        <View style={ad.stateWrap(theme)}>
          <ErrorState
            title={t('common.error', 'Error')}
            message={error}
            actionLabel={t('common.tryAgain', 'Try Again')}
            onAction={() => fetchPage(1, { append: false })}
          />
        </View>
      );
    }
    return (
      <View style={ad.stateWrap(theme)}>
        <EmptyState
          title={t('academies.empty.title', 'No academies match your filters')}
          message={t('academies.empty.subtitle', 'Try adjusting filters or clearing them to explore more.')}
          actionLabel={t('common.clearAll', 'Clear all')}
          onAction={clearAll}
        />
      </View>
    );
  }, [clearAll, error, fetchPage, loading, t, theme]);

  const renderItem = useCallback(
    ({ item, index }) => (
      <View style={ad.cardRow(theme)}>
        <StaggerWrap index={index} theme={theme}>
          <AnimatedPress>
            <AcademyCard item={item} onPress={onView} onJoin={onJoin} imageBaseUrl={API_BASE_URL} />
          </AnimatedPress>
        </StaggerWrap>
      </View>
    ),
    [onJoin, onView, theme]
  );

  return (
    <Animated.View entering={FadeInDown.duration(360)} style={ad.screen(theme)}>
      <Screen safe scroll={false} style={ad.screen(theme)}>
        <Animated.FlatList
          data={items}
          keyExtractor={(it, idx) => String(it?.academy?.id || it?.id || idx)}
          renderItem={renderItem}
          ListHeaderComponent={header}
          stickyHeaderIndices={[0]}
          ListEmptyComponent={listEmpty}
          onEndReachedThreshold={0.5}
          onEndReached={loadMore}
          onScroll={onScroll}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.accentOrange}
            />
          }
          contentContainerStyle={ad.listContent(theme)}
        />

        <BottomSheetModal visible={filtersOpen} onClose={() => setFiltersOpen(false)}>
          <View style={ad.sheetWrap(theme)}>
            <View style={ad.sheetHandle(theme)} />

            <View style={ad.sheetHeader(theme)}>
              <View style={ad.sheetHeaderLeft()}>
                <Text variant="h4" weight="bold" style={{ color: colors.textPrimary }}>
                  {t('academies.filters.title', 'Smart filters')}
                </Text>
                <Text variant="caption" color={colors.textSecondary}>
                  {t('academies.filters.subtitle', 'Refine results to match what you need.')}
                </Text>
              </View>

              <Button variant="ghost" onPress={() => setFiltersOpen(false)} style={ad.sheetCloseBtn()}>
                <X size={18} color={colors.textPrimary} />
              </Button>
            </View>

            <View style={ad.sheetBody(theme)}>
              <Input
                label={t('academies.sport', 'Sport')}
                value={sport}
                onChangeText={setSport}
                placeholder={t('academies.sportPlaceholder', 'e.g. Football')}
              />
              <Input
                label={t('academies.city', 'City')}
                value={city}
                onChangeText={setCity}
                placeholder={t('academies.cityPlaceholder', 'e.g. Amman')}
              />

              <View style={ad.sheetRow(theme)}>
                <View style={ad.sheetCol()}>
                  <Input
                    label={t('academies.ageFrom', 'Age from')}
                    value={ageFrom}
                    onChangeText={setAgeFrom}
                    placeholder="8"
                    keyboardType="number-pad"
                  />
                </View>
                <View style={ad.sheetCol()}>
                  <Input
                    label={t('academies.ageTo', 'Age to')}
                    value={ageTo}
                    onChangeText={setAgeTo}
                    placeholder="18"
                    keyboardType="number-pad"
                  />
                </View>
              </View>

              <View style={ad.togglesRow(theme)}>
                <Chip
                  label={t('academies.filter.registrationEnabled', 'Registration enabled')}
                  selected={registrationEnabled}
                  onPress={() => setRegistrationEnabled((v) => !v)}
                  icon={<Filter size={14} color={registrationEnabled ? colors.accentOrange : colors.textMuted} />}
                  style={ad.toggleChip(theme)}
                />
                <Chip
                  label={t('academies.filter.proOnly', 'PRO only')}
                  selected={proOnly}
                  onPress={() => setProOnly((v) => !v)}
                  icon={<Sparkles size={14} color={proOnly ? colors.accentOrange : colors.textMuted} />}
                  style={ad.toggleChip(theme)}
                />
              </View>

              {sort === 'nearest' ? (
                <View style={ad.hintBox(theme)}>
                  <Text variant="caption" weight="bold" style={{ color: colors.textPrimary }}>
                    {t('academies.location.title', 'Nearest sorting')}
                  </Text>
                  <Text variant="caption" color={colors.textSecondary} style={{ marginTop: 4 }}>
                    {locationStatus === 'granted'
                      ? t('academies.location.granted', 'Location enabled. Showing nearest results.')
                      : t('academies.location.prompt', 'Enable location for better nearest results.')}
                  </Text>

                  {locationStatus !== 'granted' ? (
                    <Button onPress={requestLocation} style={{ marginTop: theme.space.sm }} disabled={locationStatus === 'asking'}>
                      <Navigation size={16} color={colors.white} />
                      <Text variant="caption" weight="bold" style={{ color: colors.white }}>
                        {' '}
                        {locationStatus === 'asking'
                          ? t('academies.location.asking', 'Requesting…')
                          : t('academies.location.enable', 'Enable location')}
                      </Text>
                    </Button>
                  ) : null}
                </View>
              ) : null}

              <View style={ad.sheetActionsRow(theme)}>
                <Button variant="secondary" onPress={clearAll} style={ad.sheetActionBtn()}>
                  <Text variant="caption" weight="bold" style={{ color: colors.textPrimary }}>
                    {t('common.reset', 'Reset')}
                  </Text>
                </Button>
                <Button onPress={() => setFiltersOpen(false)} style={ad.sheetActionBtn()}>
                  <Text variant="caption" weight="bold" style={{ color: colors.white }}>
                    {t('common.apply', 'Apply')}
                  </Text>
                </Button>
              </View>
            </View>
          </View>
        </BottomSheetModal>
      </Screen>
    </Animated.View>
  );
}
