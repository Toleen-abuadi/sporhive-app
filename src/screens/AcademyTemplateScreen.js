import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  I18nManager,
  Linking,
  Modal,
  Pressable,
  Share,
  StyleSheet,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock,
  Globe,
  Heart,
  Image as ImageIcon,
  Mail,
  MapPin,
  Navigation2,
  Phone,
  ShieldCheck,
  Share2,
  Sparkles,
  Star,
  Trophy,
  Users,
  Wallet,
  X,
} from 'lucide-react-native';

import { useI18n } from '../services/i18n/i18n';
import { API_BASE_URL } from '../services/api/client';
import { useAcademyDiscoveryActions, useAcademyDiscoveryStore } from '../services/academyDiscovery/academyDiscovery.store';

import { useTheme } from '../theme/ThemeProvider';
import { borderRadius, spacing } from '../theme/tokens';
import { alphaHex } from '../theme/academyDiscovery.styles';

import { Screen } from '../components/ui/Screen';
import { Text } from '../components/ui/Text';
import { Button } from '../components/ui/Button';
import { BackButton } from '../components/ui/BackButton';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Chip } from '../components/ui/Chip';
import { ErrorState } from '../components/ui/ErrorState';
import { SmartImage } from '../components/ui/SmartImage';
import { Skeleton } from '../components/ui/Skeleton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const HERO_HEIGHT = Math.max(300, Math.min(430, Math.round(SCREEN_WIDTH * 0.82)));
const FOOTER_HEIGHT = 88;
const H_PADDING = spacing.lg;
const TABS_STICKY_HEIGHT = 64;

function safeText(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function toNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getLocalized(localeOrI18n, en, ar) {
  const langValue = typeof localeOrI18n === 'string'
    ? localeOrI18n
    : (localeOrI18n?.language || 'en');
  const lang = String(langValue).toLowerCase();
  const useArabic = lang.startsWith('ar');
  return safeText(useArabic ? (ar || en) : (en || ar));
}

function dataUrlFromBase64({ mime, base64 }) {
  if (!base64 || typeof base64 !== 'string') return null;
  if (base64.startsWith('data:') || base64.startsWith('http')) return base64;
  return `data:${mime || 'image/jpeg'};base64,${base64}`;
}

function toAbsoluteUrlMaybe(url, base) {
  if (!url) return null;
  const value = String(url);
  if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('data:')) {
    return value;
  }
  if (!base) return value;
  return `${base.replace(/\/$/, '')}/${value.replace(/^\//, '')}`;
}

function academyImageUrl(base, slug, kind) {
  if (!base || !slug) return null;
  return `${base.replace(/\/$/, '')}/public/academies/image/${encodeURIComponent(slug)}/${kind}`;
}

function resolveMediaUri(item) {
  if (!item) return null;

  const base64Candidate = item?.file_base64 || item?.media_base64 || item?.image_base64 || item?.poster_base64;
  const mimeCandidate = item?.file_meta?.mime || item?.media_meta?.mime || item?.image_meta?.mime || item?.poster_meta?.mime;
  if (base64Candidate) {
    return dataUrlFromBase64({ mime: mimeCandidate, base64: base64Candidate });
  }

  return toAbsoluteUrlMaybe(
    item?.file_url || item?.media_url || item?.image_url || item?.poster_url || item?.url,
    API_BASE_URL
  );
}

function formatNumber(locale, value, digits = 1) {
  const num = toNumber(value);
  if (num === null) return '';
  try {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: digits,
    }).format(num);
  } catch {
    return String(num);
  }
}

function formatDate(locale, value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return safeText(value);
  try {
    return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short', day: 'numeric' }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

function resolveReviews(payload, academy) {
  const source =
    payload?.reviews ||
    payload?.academy_reviews ||
    payload?.ratings ||
    academy?.reviews ||
    academy?.ratings ||
    [];

  return normalizeArray(source).map((review, idx) => {
    const name =
      safeText(review?.author_name) ||
      safeText(review?.user_name) ||
      safeText(review?.player_name) ||
      safeText(review?.name) ||
      '';

    return {
      id: review?.id ? String(review.id) : `review-${idx}`,
      author: name,
      body: safeText(review?.comment || review?.review || review?.text || review?.content),
      rating: Math.max(0, Math.min(5, toNumber(review?.rating || review?.score || review?.stars) || 0)),
      createdAt: review?.created_at || review?.date || review?.createdAt || null,
    };
  });
}

function resolveSimilarAcademies(payload, academy) {
  return normalizeArray(
    payload?.similar_academies ||
    payload?.similar ||
    academy?.similar_academies ||
    academy?.related ||
    []
  ).map((item, idx) => ({
    id: item?.id ? String(item.id) : `similar-${idx}`,
    slug: safeText(item?.slug),
    nameEn: safeText(item?.name_en || item?.name),
    nameAr: safeText(item?.name_ar),
    city: safeText(item?.city),
    country: safeText(item?.country),
    cover: toAbsoluteUrlMaybe(item?.cover_url || item?.image_url, API_BASE_URL),
    rating: toNumber(item?.rating || item?.rating_avg || item?.avg_rating),
  }));
}

const SectionHeader = memo(function SectionHeader({ title, subtitle, right }) {
  const { colors } = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <View style={{ flex: 1 }}>
        <Text variant="h3" weight="bold" style={{ color: colors.textPrimary }}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="bodySmall" color={colors.textSecondary} style={{ marginTop: 4 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ? <View style={styles.sectionHeaderRight}>{right}</View> : null}
    </View>
  );
});

const InfoCards = memo(function InfoCards({ cards }) {
  const { colors, isDark } = useTheme();
  const isRTL = I18nManager.isRTL;

  return (
    <View style={styles.infoGrid}>
      {cards.map((item) => (
        <Card
          key={item.key}
          elevated
          style={[
            styles.infoCard,
            {
              backgroundColor: colors.surface,
              borderColor: alphaHex(colors.border, '99'),
              shadowColor: colors.black,
            },
          ]}
        >
          <View
            style={[
              styles.infoIconWrap,
              {
                backgroundColor: isDark
                  ? alphaHex(colors.accentOrange, '26')
                  : alphaHex(colors.accentOrange, '14'),
              },
            ]}
          >
            {item.icon}
          </View>
          <Text variant="caption" color={colors.textSecondary}>
            {item.title}
          </Text>
          <Text
            variant="bodySmall"
            weight="bold"
            numberOfLines={2}
            style={{ color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left', marginTop: 6 }}
          >
            {item.value}
          </Text>
        </Card>
      ))}
    </View>
  );
});

const GalleryCarousel = memo(function GalleryCarousel({ items, onOpen }) {
  const { t } = useI18n();
  const { colors, isDark } = useTheme();

  const renderItem = useCallback(
    ({ item }) => (
      <Pressable
        onPress={() => onOpen(item)}
        style={({ pressed }) => [
          styles.galleryCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            opacity: pressed ? 0.9 : 1,
            transform: [{ scale: pressed ? 0.985 : 1 }],
          },
        ]}
      >
        <SmartImage
          source={item.source}
          borderRadius={16}
          style={styles.galleryImageWrap}
          imageStyle={styles.galleryImage}
          showLoader={false}
        />
        {!item.source ? (
          <LinearGradient
            colors={
              isDark
                ? [alphaHex(colors.white, '1A'), alphaHex(colors.white, '08')]
                : [alphaHex(colors.black, '14'), alphaHex(colors.black, '08')]
            }
            style={styles.galleryImageFallback}
          >
            <ImageIcon size={28} color={colors.textSecondary} />
          </LinearGradient>
        ) : null}
        <LinearGradient
          colors={[alphaHex(colors.black, '00'), alphaHex(colors.black, 'A8')]}
          style={styles.galleryImageOverlay}
        />
        <Text variant="caption" weight="medium" numberOfLines={2} style={styles.galleryCaption}>
          {item.caption || t('academy.details.images')}
        </Text>
      </Pressable>
    ),
    [colors, isDark, onOpen, t]
  );

  if (!items.length) {
    return (
      <Card style={styles.emptyCard}>
        <ImageIcon size={22} color={colors.textSecondary} />
        <Text variant="bodySmall" color={colors.textSecondary} style={{ marginTop: 8 }}>
          {t('academy.details.galleryEmpty')}
        </Text>
      </Card>
    );
  }

  return (
    <FlatList
      horizontal
      data={items}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      contentContainerStyle={styles.galleryListContent}
      showsHorizontalScrollIndicator={false}
      decelerationRate="fast"
      removeClippedSubviews
    />
  );
});

const LocationMapPreview = memo(function LocationMapPreview({ addressLabel, mapUrl, onOpenMaps, coordinatesLabel }) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const disabled = !mapUrl;
  const isRTL = I18nManager.isRTL;

  return (
    <Pressable
      onPress={disabled ? undefined : onOpenMaps}
      style={({ pressed }) => [
        styles.mapPreview,
        {
          borderColor: colors.border,
          backgroundColor: colors.surface,
          opacity: pressed && !disabled ? 0.92 : disabled ? 0.7 : 1,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={t('academy.details.map')}
    >
      <View style={styles.mapArt}>
        <LinearGradient
          colors={[alphaHex(colors.accentOrange, '33'), alphaHex(colors.accentOrange, '0D')]}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.mapPinBadge, { backgroundColor: colors.surface }]}>
          <MapPin size={18} color={colors.accentOrange} />
        </View>
      </View>
      <View style={styles.mapBody}>
        <Text variant="bodySmall" weight="bold" numberOfLines={2} style={{ color: colors.textPrimary }}>
          {addressLabel}
        </Text>
        {coordinatesLabel ? (
          <Text variant="caption" color={colors.textSecondary} style={{ marginTop: 4 }}>
            {coordinatesLabel}
          </Text>
        ) : null}
        <View style={[styles.inlineRow, { marginTop: 8, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Navigation2 size={14} color={colors.accentOrange} />
          <Text variant="caption" color={colors.accentOrange} style={{ marginHorizontal: 6 }}>
            {t('academy.details.mapHint')}
          </Text>
        </View>
      </View>
      <View style={styles.mapActionWrap}>
        <Button variant="secondary" size="small" onPress={onOpenMaps} disabled={disabled}>
          {t('academy.details.openInMaps')}
        </Button>
      </View>
    </Pressable>
  );
});

const ReviewStars = memo(function ReviewStars({ value }) {
  const { colors } = useTheme();

  return (
    <View style={styles.reviewStars}>
      {[1, 2, 3, 4, 5].map((index) => (
        <Star
          key={index}
          size={14}
          color={index <= value ? colors.warning : alphaHex(colors.textSecondary, '80')}
          fill={index <= value ? colors.warning : 'transparent'}
        />
      ))}
    </View>
  );
});

const ReviewList = memo(function ReviewList({ reviews, visibleCount, onLoadMore }) {
  const { t, language } = useI18n();
  const locale = language || 'en';
  const { colors } = useTheme();
  const shown = reviews.slice(0, visibleCount);

  if (!reviews.length) {
    return (
      <Card style={styles.emptyCard}>
        <Star size={22} color={colors.textSecondary} />
        <Text variant="bodySmall" color={colors.textSecondary} style={{ marginTop: 8 }}>
          {t('academy.details.reviewsEmpty')}
        </Text>
        <Text variant="caption" color={colors.textSecondary} style={{ marginTop: 4 }}>
          {t('academy.details.reviewsHint')}
        </Text>
      </Card>
    );
  }

  return (
    <View style={{ gap: spacing.md }}>
      {shown.map((review) => {
        const avatar = safeText(review.author).slice(0, 1).toUpperCase() || '?';
        return (
          <Card key={review.id} style={styles.reviewCard}>
            <View style={styles.reviewHead}>
              <View style={[styles.reviewAvatar, { backgroundColor: alphaHex(colors.accentOrange, '22') }]}>
                <Text variant="bodySmall" weight="bold" style={{ color: colors.accentOrange }}>
                  {avatar}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="bodySmall" weight="bold" style={{ color: colors.textPrimary }}>
                  {review.author || t('academy.details.reviewer')}
                </Text>
                <ReviewStars value={Math.round(review.rating)} />
              </View>
              {review.createdAt ? (
                <Text variant="caption" color={colors.textSecondary}>
                  {formatDate(locale, review.createdAt)}
                </Text>
              ) : null}
            </View>
            {review.body ? (
              <Text variant="bodySmall" style={{ color: colors.textSecondary, marginTop: 10, lineHeight: 20 }}>
                {review.body}
              </Text>
            ) : null}
          </Card>
        );
      })}
      {visibleCount < reviews.length ? (
        <Button variant="secondary" onPress={onLoadMore}>
          {t('academy.details.loadMoreReviews')}
        </Button>
      ) : null}
    </View>
  );
});

const ActionsFooter = memo(function ActionsFooter({
  onBookNow,
  onJoin,
  onShare,
  onToggleFavorite,
  isFavorite,
  canBook,
  joinLabel,
  insetsBottom,
}) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const isRTL = I18nManager.isRTL;

  return (
    <View pointerEvents="box-none" style={styles.footerOuter}>
      <View
        style={[
          styles.footerCard,
          {
            borderColor: colors.border,
            backgroundColor: alphaHex(colors.surface, 'F2'),
            paddingBottom: Math.max(insetsBottom, spacing.sm),
          },
        ]}
      >
        <BlurView intensity={80} style={StyleSheet.absoluteFill} />
        <View style={styles.footerInner}>
          <View style={[styles.footerIconGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Pressable
              onPress={onShare}
              style={({ pressed }) => [
                styles.footerIconBtn,
                {
                  backgroundColor: alphaHex(colors.textPrimary, '0F'),
                  borderColor: colors.border,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={t('academy.details.share')}
            >
              <Share2 size={18} color={colors.textPrimary} />
            </Pressable>
            <Pressable
              onPress={onToggleFavorite}
              style={({ pressed }) => [
                styles.footerIconBtn,
                {
                  backgroundColor: alphaHex(colors.textPrimary, '0F'),
                  borderColor: colors.border,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={isFavorite ? t('academy.details.favourited') : t('academy.details.favourite')}
            >
              <Heart
                size={18}
                color={isFavorite ? colors.error : colors.textPrimary}
                fill={isFavorite ? colors.error : 'transparent'}
              />
            </Pressable>
          </View>
          <View style={styles.footerButtons}>
            <Button variant="secondary" onPress={onBookNow} disabled={!canBook} style={styles.footerBtn}>
              {t('academy.details.bookNow')}
            </Button>
            <Button onPress={onJoin} style={styles.footerBtn}>
              {joinLabel}
            </Button>
          </View>
        </View>
      </View>
    </View>
  );
});

const HeroSection = memo(function HeroSection({
  academyName,
  locationLabel,
  coverSource,
  logoSource,
  ratingLabel,
  registrationOpen,
  secureEnabled,
  onShare,
  heroTranslateY,
  heroScale,
  insetsTop,
}) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const isRTL = I18nManager.isRTL;

  return (
    <View style={styles.heroShell}>
      <Animated.View style={[styles.heroMedia, { transform: [{ translateY: heroTranslateY }, { scale: heroScale }] }]}>
        <SmartImage
          source={coverSource}
          style={styles.heroImage}
          borderRadius={0}
          showLoader={false}
          accessibilityLabel={academyName}
        />
        {!coverSource ? (
          <View style={styles.heroFallback}>
            <Sparkles size={36} color={alphaHex(colors.white, 'C2')} />
          </View>
        ) : null}
        <LinearGradient
          colors={[alphaHex(colors.black, '52'), alphaHex(colors.black, '1A'), alphaHex(colors.black, 'B3')]}
          locations={[0, 0.45, 1]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <View style={[styles.heroOverlay, { paddingTop: insetsTop + spacing.sm }]}>
        <View style={[styles.heroTopRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <BackButton color={colors.white} style={[styles.heroTopIcon, { backgroundColor: alphaHex(colors.black, '66') }]} />
          <Pressable
            onPress={onShare}
            style={({ pressed }) => [
              styles.heroTopIcon,
              {
                backgroundColor: alphaHex(colors.black, '66'),
                opacity: pressed ? 0.82 : 1,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('academy.details.share')}
          >
            <Share2 size={18} color={colors.white} />
          </Pressable>
        </View>

        <View style={styles.heroBottomContent}>
          <View style={[styles.heroIdentityRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.heroLogoWrap, { borderColor: alphaHex(colors.white, '5E') }]}>
              {logoSource ? (
                <SmartImage
                  source={logoSource}
                  style={styles.heroLogo}
                  borderRadius={16}
                  showLoader={false}
                  imageStyle={styles.heroLogoImage}
                />
              ) : (
                <Sparkles size={20} color={colors.white} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="h1" weight="bold" numberOfLines={2} style={{ color: colors.white }}>
                {academyName}
              </Text>
              <View style={[styles.inlineRow, { marginTop: 6, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <MapPin size={14} color={alphaHex(colors.white, 'D9')} />
                <Text variant="bodySmall" numberOfLines={1} style={{ color: alphaHex(colors.white, 'E6'), marginHorizontal: 6 }}>
                  {locationLabel}
                </Text>
              </View>
            </View>
            <View style={[styles.heroRatingPill, { backgroundColor: alphaHex(colors.black, '66') }]}>
              <Star size={13} color={colors.warning} fill={colors.warning} />
              <Text variant="caption" weight="bold" style={{ color: colors.white, marginLeft: 4 }}>
                {ratingLabel}
              </Text>
            </View>
          </View>

          <View style={[styles.heroStatusRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View
              style={[
                styles.heroStatusChip,
                {
                  backgroundColor: registrationOpen
                    ? alphaHex(colors.success, '29')
                    : alphaHex(colors.error, '29'),
                  borderColor: registrationOpen ? colors.success : colors.error,
                },
              ]}
            >
              <CheckCircle2 size={14} color={registrationOpen ? colors.success : colors.error} />
              <Text
                variant="caption"
                weight="bold"
                style={{
                  color: registrationOpen ? colors.success : colors.error,
                  marginHorizontal: 5,
                }}
              >
                {registrationOpen
                  ? t('academy.details.registrationOpen')
                  : t('academy.details.registrationClosed')}
              </Text>
            </View>

            {secureEnabled ? (
              <View
                style={[
                  styles.heroStatusChip,
                  {
                    backgroundColor: alphaHex(colors.info, '24'),
                    borderColor: alphaHex(colors.info, '75'),
                  },
                ]}
              >
                <ShieldCheck size={14} color={colors.info} />
                <Text variant="caption" weight="bold" style={{ color: colors.info, marginHorizontal: 5 }}>
                  {t('academy.details.secure')}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
});

const AcademyDetailsSkeleton = memo(function AcademyDetailsSkeleton() {
  const { isDark } = useTheme();
  const mode = isDark ? 'dark' : 'light';

  return (
    <View style={styles.skeletonContainer}>
      <Skeleton height={HERO_HEIGHT} radius={0} mode={mode} />
      <View style={{ paddingHorizontal: H_PADDING, paddingTop: spacing.lg, gap: spacing.lg }}>
        <Skeleton height={24} radius={10} mode={mode} width="55%" />
        <View style={styles.skeletonGrid}>
          {[1, 2, 3, 4].map((id) => (
            <Skeleton key={`skeleton-info-${id}`} height={102} radius={18} mode={mode} style={{ width: '48%' }} />
          ))}
        </View>
        <Skeleton height={160} radius={22} mode={mode} />
        <Skeleton height={180} radius={22} mode={mode} />
      </View>
    </View>
  );
});

export function AcademyTemplateScreen({ slug }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, language } = useI18n();
  const locale = language || 'en';
  const { colors, isDark } = useTheme();
  const isRTL = I18nManager.isRTL;

  const { detailsBySlug, detailsLoadingBySlug, detailsErrorBySlug } = useAcademyDiscoveryStore((state) => ({
    detailsBySlug: state.detailsBySlug,
    detailsLoadingBySlug: state.detailsLoadingBySlug,
    detailsErrorBySlug: state.detailsErrorBySlug,
  }));
  const discoveryActions = useAcademyDiscoveryActions();

  const payload = slug ? detailsBySlug?.[slug] : null;
  const loading = slug ? Boolean(detailsLoadingBySlug?.[slug]) : false;
  const error = slug ? safeText(detailsErrorBySlug?.[slug]) : t('academy.details.error');

  const scrollRef = useRef(null);
  const sectionsY = useRef({});
  const scrollY = useRef(new Animated.Value(0)).current;
  const enter = useRef(new Animated.Value(0)).current;
  const activeTabRef = useRef('overview');

  const [activeTab, setActiveTab] = useState('overview');
  const [mediaPreview, setMediaPreview] = useState(null);
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [visibleReviewCount, setVisibleReviewCount] = useState(3);

  const load = useCallback(async () => {
    if (!slug) return;
    await discoveryActions.fetchDetails(slug);
  }, [discoveryActions, slug]);

  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: 320,
      useNativeDriver: true,
    }).start();
  }, [enter]);

  useEffect(() => {
    if (!slug) return;
    load();
  }, [load, slug]);

  useEffect(() => {
    setVisibleReviewCount(3);
    setActiveTab('overview');
    activeTabRef.current = 'overview';
  }, [slug]);

  const academy = payload?.academy || null;
  const templateSections = payload?.template_sections || {};
  const hasTemplateToggles = Object.keys(templateSections).length > 0;
  const allowSection = useCallback(
    (key) => (hasTemplateToggles ? templateSections?.[key] !== false : true),
    [hasTemplateToggles, templateSections]
  );

  const courses = useMemo(() => normalizeArray(payload?.courses), [payload]);
  const mediaByType = payload?.media_by_type || {};
  const sportTypes = useMemo(() => normalizeArray(academy?.sport_types), [academy]);
  const contactPhones = useMemo(() => normalizeArray(academy?.contact_phones), [academy]);
  const facilities = useMemo(
    () => normalizeArray(academy?.facilities || academy?.facility_highlights || payload?.facilities),
    [academy, payload]
  );

  const galleryItems = useMemo(() => {
    const buckets = ['court', 'field', 'training', 'team', 'poster', 'championship', 'certificate', 'other', 'gallery'];
    return buckets.flatMap((bucket) => {
      const list = normalizeArray(mediaByType?.[bucket]);
      return list.map((item, idx) => ({
        id: `${bucket}-${item?.id || idx}`,
        source: resolveMediaUri(item) ? { uri: resolveMediaUri(item) } : null,
        caption: safeText(item?.caption_en || item?.caption_ar || item?.name || bucket),
        item,
      }));
    });
  }, [mediaByType]);

  const courtImagesCount = useMemo(
    () =>
      ['court', 'field', 'training'].reduce(
        (count, key) => count + normalizeArray(mediaByType?.[key]).length,
        0
      ),
    [mediaByType]
  );

  const reviews = useMemo(() => resolveReviews(payload, academy), [payload, academy]);
  const similarAcademies = useMemo(() => resolveSimilarAcademies(payload, academy), [payload, academy]);

  const academyName = useMemo(() => {
    if (!academy) return '';
    return (
      getLocalized(locale, academy?.name_en, academy?.name_ar) ||
      safeText(academy?.name) ||
      t('academy.details.title')
    );
  }, [academy, locale, t]);

  const aboutText = useMemo(
    () =>
      getLocalized(
        locale,
        academy?.short_desc_en || academy?.description_en,
        academy?.short_desc_ar || academy?.description_ar
      ),
    [academy, locale]
  );

  const academyDeepLink = useMemo(
    () => (academy?.slug ? `https://sporthive.app/academies/${academy.slug}` : ''),
    [academy]
  );

  const coverUri = useMemo(() => {
    if (!academy?.slug) return null;
    return (
      dataUrlFromBase64({ mime: academy?.cover_meta?.mime, base64: academy?.cover_base64 }) ||
      toAbsoluteUrlMaybe(academy?.cover_url, API_BASE_URL) ||
      academyImageUrl(API_BASE_URL, academy.slug, 'cover')
    );
  }, [academy]);

  const logoUri = useMemo(() => {
    if (!academy?.slug) return null;
    return (
      dataUrlFromBase64({ mime: academy?.logo_meta?.mime, base64: academy?.logo_base64 }) ||
      toAbsoluteUrlMaybe(academy?.logo_url, API_BASE_URL) ||
      academyImageUrl(API_BASE_URL, academy.slug, 'logo')
    );
  }, [academy]);

  const coverSource = useMemo(() => (coverUri ? { uri: coverUri } : null), [coverUri]);
  const logoSource = useMemo(() => (logoUri ? { uri: logoUri } : null), [logoUri]);

  const mapUrl = useMemo(() => {
    if (academy?.lat != null && academy?.lng != null) {
      return `https://www.google.com/maps?q=${academy.lat},${academy.lng}`;
    }
    const address = safeText(academy?.address);
    if (address) return `https://www.google.com/maps?q=${encodeURIComponent(address)}`;
    return '';
  }, [academy]);

  const locationLabel = useMemo(() => {
    const cityCountry = [safeText(academy?.city), safeText(academy?.country)].filter(Boolean).join(', ');
    if (cityCountry) return cityCountry;
    const address = safeText(academy?.address);
    if (address) return address;
    return t('academy.details.notAvailable');
  }, [academy, t]);

  const coordinatesLabel = useMemo(() => {
    if (academy?.lat == null || academy?.lng == null) return '';
    return `${Number(academy.lat).toFixed(6)}, ${Number(academy.lng).toFixed(6)}`;
  }, [academy]);

  const registrationOpen = Boolean(academy?.registration_open);
  const secureEnabled = Boolean(academy?.is_verified || academy?.is_secure || academy?.is_pro);
  const canBookNow = Boolean(academy?.has_facilities_booking);

  const ratingValue = toNumber(academy?.rating || academy?.rating_avg || academy?.avg_rating);
  const ratingCount = toNumber(academy?.rating_count || academy?.ratings_count || academy?.ratingCount);
  const ratingLabel = ratingValue !== null
    ? `${formatNumber(locale, ratingValue, 1)}${ratingCount ? ` (${formatNumber(locale, ratingCount, 0)})` : ''}`
    : t('academy.details.notAvailable');

  const distanceLabel = useMemo(() => {
    const distanceText = safeText(academy?.distance_text || academy?.distance_label);
    if (distanceText) return distanceText;
    const distanceKm = toNumber(academy?.distance_km || academy?.distanceKm);
    if (distanceKm !== null) {
      return t('academy.details.distanceKm', { distance: formatNumber(locale, distanceKm, 1) });
    }
    return t('academy.details.notAvailable');
  }, [academy, locale, t]);

  const feeLabel = useMemo(() => {
    const amount = toNumber(academy?.subscription_fee_amount || academy?.min_fee || academy?.price_from);
    const feeType = safeText(academy?.subscription_fee_type || academy?.fee_type);
    if (amount !== null) {
      return `${formatNumber(locale, amount, 0)} ${feeType}`.trim();
    }
    return safeText(academy?.price_range) || t('academy.details.priceOnRequest');
  }, [academy, locale, t]);

  const dayLabels = useMemo(
    () => ({
      0: t('academy.details.days.sunday'),
      1: t('academy.details.days.monday'),
      2: t('academy.details.days.tuesday'),
      3: t('academy.details.days.wednesday'),
      4: t('academy.details.days.thursday'),
      5: t('academy.details.days.friday'),
      6: t('academy.details.days.saturday'),
    }),
    [t]
  );

  const scheduleEntries = useMemo(() => {
    const entries = [];
    courses.forEach((course, courseIndex) => {
      const title = getLocalized(locale, course?.name_en, course?.name_ar) || t('academy.details.courseFallback');
      normalizeArray(course?.schedules).forEach((schedule, scheduleIndex) => {
        const dayOfWeek = toNumber(schedule?.day_of_week);
        const start = safeText(schedule?.start_time).slice(0, 5);
        const end = safeText(schedule?.end_time).slice(0, 5);
        entries.push({
          id: `${course?.id || courseIndex}-${scheduleIndex}`,
          courseTitle: title,
          day: dayOfWeek !== null ? dayLabels[dayOfWeek] || t('academy.details.notAvailable') : t('academy.details.notAvailable'),
          start,
          end,
        });
      });
    });
    return entries;
  }, [courses, dayLabels, locale, t]);

  const nextSessionLabel = useMemo(() => {
    if (!scheduleEntries.length) return t('academy.details.notAvailable');
    const session = scheduleEntries[0];
    const time = session.end ? `${session.start}-${session.end}` : session.start;
    return `${session.day} • ${time}`;
  }, [scheduleEntries, t]);

  const coachesCount = useMemo(() => {
    const fromAcademy = toNumber(academy?.number_of_coaches);
    if (fromAcademy !== null) return fromAcademy;
    return courses.reduce((sum, course) => sum + normalizeArray(course?.coaches).length, 0);
  }, [academy, courses]);

  const facilitiesLabel = useMemo(() => {
    if (facilities.length > 0) return facilities.slice(0, 2).join(' • ');
    if (academy?.has_facilities_booking) return t('academy.details.facilitiesAvailable');
    return t('academy.details.notAvailable');
  }, [academy, facilities, t]);

  const infoCards = useMemo(
    () => [
      {
        key: 'distance',
        title: t('academy.details.distance'),
        value: distanceLabel,
        icon: <MapPin size={18} color={colors.accentOrange} />,
      },
      {
        key: 'open-status',
        title: t('academy.details.openStatus'),
        value: registrationOpen ? t('academy.details.registrationOpen') : t('academy.details.registrationClosed'),
        icon: <Clock size={18} color={colors.accentOrange} />,
      },
      {
        key: 'facilities',
        title: t('academy.details.facilities'),
        value: facilitiesLabel,
        icon: <Trophy size={18} color={colors.accentOrange} />,
      },
      {
        key: 'fees',
        title: t('academy.details.fees'),
        value: feeLabel,
        icon: <Wallet size={18} color={colors.accentOrange} />,
      },
    ],
    [colors.accentOrange, distanceLabel, facilitiesLabel, feeLabel, registrationOpen, t]
  );

  const secondaryInfo = useMemo(
    () => [
      {
        key: 'trainers',
        title: t('academy.details.trainers'),
        value: coachesCount ? formatNumber(locale, coachesCount, 0) : t('academy.details.notAvailable'),
        icon: <Users size={16} color={colors.accentOrange} />,
      },
      {
        key: 'facilities',
        title: t('academy.details.facilities'),
        value: facilities.length ? formatNumber(locale, facilities.length, 0) : t('academy.details.notAvailable'),
        icon: <ShieldCheck size={16} color={colors.accentOrange} />,
      },
      {
        key: 'fields',
        title: t('academy.details.playingFields'),
        value: sportTypes.length ? formatNumber(locale, sportTypes.length, 0) : t('academy.details.notAvailable'),
        icon: <Trophy size={16} color={colors.accentOrange} />,
      },
      {
        key: 'courts',
        title: t('academy.details.courtImages'),
        value: courtImagesCount ? formatNumber(locale, courtImagesCount, 0) : t('academy.details.notAvailable'),
        icon: <ImageIcon size={16} color={colors.accentOrange} />,
      },
    ],
    [coachesCount, colors.accentOrange, courtImagesCount, facilities.length, locale, sportTypes.length, t]
  );

  const tabItems = useMemo(() => {
    const tabs = [{ key: 'overview', label: t('academy.details.overview') }];
    if (allowSection('courses')) tabs.push({ key: 'courses', label: t('academy.details.courses') });
    tabs.push({ key: 'schedule', label: t('academy.details.schedule') });
    tabs.push({ key: 'reviews', label: t('academy.details.reviews') });
    return tabs;
  }, [allowSection, t]);

  const captureSectionY = useCallback(
    (key) => (event) => {
      sectionsY.current[key] = event.nativeEvent.layout.y;
    },
    []
  );

  const scrollToSection = useCallback(
    (key) => {
      const y = sectionsY.current?.[key];
      if (typeof y !== 'number') return;
      activeTabRef.current = key;
      setActiveTab(key);
      scrollRef.current?.scrollTo({
        y: Math.max(0, y - TABS_STICKY_HEIGHT - spacing.sm),
        animated: true,
      });
    },
    []
  );

  const openUrl = useCallback(async (url) => {
    if (!url) return;
    try {
      await Linking.openURL(url);
    } catch {
      // no-op
    }
  }, []);

  const onShare = useCallback(async () => {
    const shareTarget = academyDeepLink || mapUrl || '';
    try {
      await Share.share({
        message: t('academy.details.shareMessage', { academy: academyName, url: shareTarget }).trim(),
      });
    } catch {
      // no-op
    }
  }, [academyDeepLink, academyName, mapUrl, t]);

  const onCall = useCallback(() => {
    const phone = safeText(contactPhones?.[0]);
    if (!phone) return;
    openUrl(`tel:${phone}`);
  }, [contactPhones, openUrl]);

  const onEmail = useCallback(() => {
    const email = safeText(academy?.contact_email);
    if (!email) return;
    openUrl(`mailto:${email}`);
  }, [academy, openUrl]);

  const onOpenMaps = useCallback(() => {
    if (!mapUrl) return;
    openUrl(mapUrl);
  }, [mapUrl, openUrl]);

  const onOpenWebsite = useCallback(() => {
    const website = safeText(academy?.website);
    if (!website) return;
    openUrl(website.startsWith('http') ? website : `https://${website}`);
  }, [academy, openUrl]);

  const onJoin = useCallback(() => {
    if (!academy?.slug) return;
    if (academy?.registration_enabled && academy?.registration_open) {
      router.push(`/academies/${academy.slug}/join`);
      return;
    }
    scrollToSection('contact');
  }, [academy, router, scrollToSection]);

  const onBookNow = useCallback(() => {
    if (!academy?.has_facilities_booking) return;
    router.push('/playgrounds/explore');
  }, [academy, router]);

  const onToggleFavorite = useCallback(() => {
    setIsFavorite((prev) => !prev);
  }, []);

  const onOpenMediaPreview = useCallback((media) => {
    setMediaPreview(media);
    setLightboxVisible(true);
  }, []);

  const onCloseMediaPreview = useCallback(() => {
    setLightboxVisible(false);
    setMediaPreview(null);
  }, []);

  const onOpenSimilar = useCallback(
    (item) => {
      if (!item?.slug) return;
      router.push(`/academies/${item.slug}`);
    },
    [router]
  );

  const handleLoadMoreReviews = useCallback(() => {
    setVisibleReviewCount((prev) => Math.min(prev + 4, reviews.length));
  }, [reviews.length]);

  const handleScrollListener = useCallback((event) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    let nextTab = activeTabRef.current;

    tabItems.forEach((tab) => {
      const y = sectionsY.current?.[tab.key];
      if (typeof y === 'number' && offsetY + TABS_STICKY_HEIGHT + 14 >= y) {
        nextTab = tab.key;
      }
    });

    if (nextTab !== activeTabRef.current) {
      activeTabRef.current = nextTab;
      setActiveTab(nextTab);
    }
  }, [tabItems]);

  const onScroll = useMemo(
    () =>
      Animated.event(
        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
        { useNativeDriver: false, listener: handleScrollListener }
      ),
    [handleScrollListener, scrollY]
  );

  const topBarOpacity = scrollY.interpolate({
    inputRange: [0, HERO_HEIGHT * 0.38, HERO_HEIGHT * 0.62],
    outputRange: [0, 0.2, 1],
    extrapolate: 'clamp',
  });

  const heroTranslateY = scrollY.interpolate({
    inputRange: [-HERO_HEIGHT, 0, HERO_HEIGHT],
    outputRange: [-HERO_HEIGHT * 0.42, 0, HERO_HEIGHT * 0.15],
    extrapolate: 'clamp',
  });

  const heroScale = scrollY.interpolate({
    inputRange: [-HERO_HEIGHT, 0, HERO_HEIGHT],
    outputRange: [1.25, 1, 1],
    extrapolate: 'clamp',
  });

  const contentEnterStyle = {
    opacity: enter,
    transform: [
      {
        translateY: enter.interpolate({
          inputRange: [0, 1],
          outputRange: [12, 0],
        }),
      },
    ],
  };

  if (!slug) {
    return (
      <Screen safe>
        <View style={styles.fallbackHeader}>
          <BackButton />
        </View>
        <ErrorState
          title={t('academy.details.errorTitle')}
          message={t('academy.details.error')}
          actionLabel={t('academy.details.retry')}
          onAction={load}
        />
      </Screen>
    );
  }

  if (loading && !payload) {
    return (
      <Screen safe style={{ backgroundColor: colors.background }}>
        <View style={styles.fallbackHeader}>
          <BackButton />
        </View>
        <AcademyDetailsSkeleton />
      </Screen>
    );
  }

  if (error && !payload) {
    return (
      <Screen safe>
        <View style={styles.fallbackHeader}>
          <BackButton />
        </View>
        <ErrorState
          title={t('academy.details.errorTitle')}
          message={error || t('academy.details.error')}
          actionLabel={t('academy.details.retry')}
          onAction={load}
        />
      </Screen>
    );
  }

  return (
    <Screen safe style={{ backgroundColor: colors.background }}>
      <Animated.View
        style={[
          styles.topBar,
          {
            borderBottomColor: alphaHex(colors.border, 'AA'),
            backgroundColor: alphaHex(colors.surface, isDark ? 'E6' : 'F2'),
            opacity: topBarOpacity,
            paddingTop: insets.top,
          },
        ]}
      >
        <BlurView intensity={80} style={StyleSheet.absoluteFill} />
        <View style={[styles.topBarRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <BackButton color={colors.textPrimary} style={styles.topBarBack} />
          <View style={styles.topBarTitleWrap}>
            <Text variant="body" weight="bold" numberOfLines={1} style={{ color: colors.textPrimary }}>
              {academyName}
            </Text>
            <Text variant="caption" numberOfLines={1} style={{ color: colors.textSecondary, marginTop: 2 }}>
              {locationLabel}
            </Text>
          </View>
          <Pressable
            onPress={onShare}
            style={({ pressed }) => [
              styles.topBarAction,
              {
                borderColor: colors.border,
                backgroundColor: colors.surface,
                opacity: pressed ? 0.84 : 1,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('academy.details.share')}
          >
            <Share2 size={18} color={colors.textPrimary} />
          </Pressable>
        </View>
      </Animated.View>

      <Animated.ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: FOOTER_HEIGHT + insets.bottom + spacing['3xl'] }}
        stickyHeaderIndices={[1]}
        scrollEventThrottle={16}
        onScroll={onScroll}
      >
        <HeroSection
          academyName={academyName}
          locationLabel={locationLabel}
          coverSource={coverSource}
          logoSource={logoSource}
          ratingLabel={ratingLabel}
          registrationOpen={registrationOpen}
          secureEnabled={secureEnabled}
          onShare={onShare}
          heroTranslateY={heroTranslateY}
          heroScale={heroScale}
          insetsTop={insets.top}
        />

        <View
          style={[
            styles.tabsSticky,
            {
              borderBottomColor: alphaHex(colors.border, '7A'),
              backgroundColor: alphaHex(colors.background, isDark ? 'F2' : 'FA'),
            },
          ]}
        >
          <FlatList
            horizontal
            data={tabItems}
            keyExtractor={(item) => item.key}
            contentContainerStyle={styles.tabsContent}
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <Chip
                label={item.label}
                selected={activeTab === item.key}
                onPress={() => scrollToSection(item.key)}
                icon={
                  item.key === 'overview' ? <BookOpen size={14} color={activeTab === item.key ? colors.accentOrange : colors.textSecondary} /> :
                    item.key === 'courses' ? <Trophy size={14} color={activeTab === item.key ? colors.accentOrange : colors.textSecondary} /> :
                      item.key === 'schedule' ? <CalendarDays size={14} color={activeTab === item.key ? colors.accentOrange : colors.textSecondary} /> :
                        <Star size={14} color={activeTab === item.key ? colors.accentOrange : colors.textSecondary} />
                }
                style={styles.tabChip}
              />
            )}
          />
        </View>

        <Animated.View style={[styles.content, contentEnterStyle]}>
          <View onLayout={captureSectionY('overview')} style={styles.sectionBlock}>
            <SectionHeader
              title={t('academy.details.overview')}
              subtitle={t('academy.details.featureHighlights')}
            />

            <Card style={styles.sectionCard}>
              <Text variant="body" style={{ color: colors.textPrimary, lineHeight: 24 }}>
                {aboutText || t('academy.details.aboutFallback')}
              </Text>
              {academy?.website ? (
                <Pressable
                  onPress={onOpenWebsite}
                  style={({ pressed }) => [
                    styles.websiteRow,
                    {
                      borderColor: alphaHex(colors.accentOrange, '6B'),
                      backgroundColor: alphaHex(colors.accentOrange, '12'),
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <Globe size={15} color={colors.accentOrange} />
                  <Text
                    variant="bodySmall"
                    weight="bold"
                    style={{ color: colors.accentOrange, marginHorizontal: 8 }}
                  >
                    {t('academy.details.website')}
                  </Text>
                </Pressable>
              ) : null}
            </Card>

            <InfoCards cards={infoCards} />

            <Card style={styles.sectionCard}>
              <View style={styles.trustRows}>
                <View style={[styles.inlineRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <CheckCircle2 size={16} color={colors.success} />
                  <Text variant="bodySmall" style={{ color: colors.textPrimary, marginHorizontal: 8 }}>
                    {t('academy.details.openRegistration')}
                  </Text>
                </View>
                <View style={[styles.inlineRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <ShieldCheck size={16} color={colors.info} />
                  <Text variant="bodySmall" style={{ color: colors.textPrimary, marginHorizontal: 8 }}>
                    {t('academy.details.secureEncrypted')}
                  </Text>
                </View>
                <View style={[styles.inlineRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Clock size={16} color={colors.warning} />
                  <Text variant="bodySmall" style={{ color: colors.textPrimary, marginHorizontal: 8 }}>
                    {t('academy.details.responseTime')}
                  </Text>
                </View>
              </View>
            </Card>
          </View>

          {allowSection('stats') ? (
            <View style={styles.sectionBlock}>
              <SectionHeader
                title={t('academy.details.academiesSportsOffered')}
                subtitle={t('academy.details.sportsOffered')}
              />

              <Card style={styles.sectionCard}>
                {sportTypes.length ? (
                  <View style={styles.sportChips}>
                    {sportTypes.map((sport, idx) => (
                      <Badge key={`${sport}-${idx}`} variant="default" style={styles.sportBadge}>
                        {safeText(sport)}
                      </Badge>
                    ))}
                  </View>
                ) : (
                  <Text variant="bodySmall" color={colors.textSecondary}>
                    {t('academy.details.notAvailable')}
                  </Text>
                )}
              </Card>

              <View style={styles.secondaryGrid}>
                {secondaryInfo.map((item) => (
                  <Card key={item.key} style={styles.secondaryCard}>
                    <View style={styles.inlineRow}>
                      {item.icon}
                      <Text
                        variant="caption"
                        color={colors.textSecondary}
                        style={{ marginHorizontal: 6 }}
                      >
                        {item.title}
                      </Text>
                    </View>
                    <Text variant="h4" weight="bold" style={{ color: colors.textPrimary, marginTop: 6 }}>
                      {item.value}
                    </Text>
                  </Card>
                ))}
              </View>
            </View>
          ) : null}

          {allowSection('courses') ? (
            <View onLayout={captureSectionY('courses')} style={styles.sectionBlock}>
              <SectionHeader title={t('academy.details.courses')} subtitle={t('academy.details.schedule')} />

              {courses.length ? (
                <View style={{ gap: spacing.md }}>
                  {courses.map((course, idx) => {
                    const title = getLocalized(locale, course?.name_en, course?.name_ar) || t('academy.details.courseFallback');
                    const ageFrom = toNumber(course?.age_from);
                    const ageTo = toNumber(course?.age_to);
                    const coaches = normalizeArray(course?.coaches);
                    return (
                      <Card key={course?.id || `course-${idx}`} style={styles.courseCard}>
                        <View style={styles.inlineRow}>
                          <BookOpen size={16} color={colors.accentOrange} />
                          <Text variant="bodySmall" weight="bold" style={{ color: colors.textPrimary, marginHorizontal: 8 }}>
                            {title}
                          </Text>
                        </View>
                        {(ageFrom !== null || ageTo !== null) ? (
                          <Text variant="caption" color={colors.textSecondary} style={{ marginTop: 6 }}>
                            {t('academy.details.ageRange', {
                              from: ageFrom !== null ? formatNumber(locale, ageFrom, 0) : '-',
                              to: ageTo !== null ? formatNumber(locale, ageTo, 0) : '-',
                            })}
                          </Text>
                        ) : null}
                        {coaches.length ? (
                          <Text variant="caption" color={colors.textSecondary} style={{ marginTop: 4 }}>
                            {coaches.slice(0, 4).join(' • ')}
                          </Text>
                        ) : null}
                      </Card>
                    );
                  })}
                </View>
              ) : (
                <Card style={styles.emptyCard}>
                  <BookOpen size={20} color={colors.textSecondary} />
                  <Text variant="bodySmall" color={colors.textSecondary} style={{ marginTop: 8 }}>
                    {t('academy.details.noCourses')}
                  </Text>
                </Card>
              )}
            </View>
          ) : null}

          <View onLayout={captureSectionY('schedule')} style={styles.sectionBlock}>
            <SectionHeader
              title={t('academy.details.schedule')}
              subtitle={`${t('academy.details.nextSession')}: ${nextSessionLabel}`}
            />

            {scheduleEntries.length ? (
              <View style={{ gap: spacing.sm }}>
                {scheduleEntries.slice(0, 12).map((session) => (
                  <Card key={session.id} style={styles.scheduleCard}>
                    <View style={[styles.inlineRow, { justifyContent: 'space-between' }]}>
                      <View style={{ flex: 1 }}>
                        <Text variant="bodySmall" weight="bold" style={{ color: colors.textPrimary }}>
                          {session.courseTitle}
                        </Text>
                        <Text variant="caption" color={colors.textSecondary} style={{ marginTop: 4 }}>
                          {session.day}
                        </Text>
                      </View>
                      <Text variant="bodySmall" weight="bold" style={{ color: colors.accentOrange }}>
                        {session.end ? `${session.start}-${session.end}` : session.start}
                      </Text>
                    </View>
                  </Card>
                ))}
              </View>
            ) : (
              <Card style={styles.emptyCard}>
                <CalendarDays size={20} color={colors.textSecondary} />
                <Text variant="bodySmall" color={colors.textSecondary} style={{ marginTop: 8 }}>
                  {t('academy.details.noSchedule')}
                </Text>
              </Card>
            )}
          </View>

          {(allowSection('media_gallery') || allowSection('media_ads')) ? (
            <View style={styles.sectionBlock}>
              <SectionHeader
                title={t('academy.details.imagesGallery')}
                subtitle={t('academy.details.images')}
              />
              <GalleryCarousel items={galleryItems} onOpen={onOpenMediaPreview} />
            </View>
          ) : null}

          {allowSection('location') ? (
            <View style={styles.sectionBlock}>
              <SectionHeader title={t('academy.details.location')} subtitle={t('academy.details.map')} />
              <LocationMapPreview
                addressLabel={safeText(academy?.address) || locationLabel}
                mapUrl={mapUrl}
                onOpenMaps={onOpenMaps}
                coordinatesLabel={coordinatesLabel}
              />
            </View>
          ) : null}

          <View onLayout={captureSectionY('reviews')} style={styles.sectionBlock}>
            <SectionHeader
              title={t('academy.details.reviews')}
              subtitle={t('academy.details.reviewsCount', { count: reviews.length })}
            />
            <ReviewList
              reviews={reviews}
              visibleCount={visibleReviewCount}
              onLoadMore={handleLoadMoreReviews}
            />
          </View>

          {similarAcademies.length ? (
            <View style={styles.sectionBlock}>
              <SectionHeader title={t('academy.details.similarAcademies')} />
              <FlatList
                horizontal
                data={similarAcademies}
                keyExtractor={(item) => item.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.similarList}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => onOpenSimilar(item)}
                    style={({ pressed }) => [
                      styles.similarCard,
                      {
                        borderColor: colors.border,
                        backgroundColor: colors.surface,
                        opacity: pressed ? 0.9 : 1,
                      },
                    ]}
                  >
                    <SmartImage source={item.cover ? { uri: item.cover } : null} style={styles.similarImage} borderRadius={14} showLoader={false} />
                    <Text
                      variant="bodySmall"
                      weight="bold"
                      numberOfLines={1}
                      style={{ color: colors.textPrimary, marginTop: 8 }}
                    >
                      {getLocalized(locale, item.nameEn, item.nameAr) || t('academy.details.title')}
                    </Text>
                    <Text variant="caption" color={colors.textSecondary} numberOfLines={1}>
                      {[item.city, item.country].filter(Boolean).join(', ') || t('academy.details.notAvailable')}
                    </Text>
                  </Pressable>
                )}
              />
            </View>
          ) : null}

          <View onLayout={captureSectionY('contact')} style={styles.sectionBlock}>
            <SectionHeader title={t('academy.details.contact')} />
            <Card style={styles.sectionCard}>
              <View style={[styles.contactButtons, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Button
                  variant="secondary"
                  onPress={onCall}
                  disabled={!contactPhones.length}
                  style={styles.contactBtn}
                >
                  {t('academy.details.call')}
                </Button>
                <Button
                  variant="secondary"
                  onPress={onEmail}
                  disabled={!safeText(academy?.contact_email)}
                  style={styles.contactBtn}
                >
                  {t('academy.details.email')}
                </Button>
              </View>

              {contactPhones.length ? (
                <View style={[styles.inlineRow, { marginTop: 10, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Phone size={14} color={colors.textSecondary} />
                  <Text variant="caption" color={colors.textSecondary} style={{ marginHorizontal: 8 }}>
                    {safeText(contactPhones[0])}
                  </Text>
                </View>
              ) : null}

              {academy?.contact_email ? (
                <View style={[styles.inlineRow, { marginTop: 6, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Mail size={14} color={colors.textSecondary} />
                  <Text variant="caption" color={colors.textSecondary} style={{ marginHorizontal: 8 }}>
                    {safeText(academy.contact_email)}
                  </Text>
                </View>
              ) : null}
            </Card>
          </View>
        </Animated.View>
      </Animated.ScrollView>

      <ActionsFooter
        onBookNow={onBookNow}
        onJoin={onJoin}
        onShare={onShare}
        onToggleFavorite={onToggleFavorite}
        isFavorite={isFavorite}
        canBook={canBookNow}
        joinLabel={registrationOpen ? t('academy.details.joinAcademy') : t('academy.details.contact')}
        insetsBottom={insets.bottom}
      />

      <Modal
        visible={lightboxVisible}
        transparent
        animationType="fade"
        onRequestClose={onCloseMediaPreview}
      >
        <View style={[styles.lightboxOuter, { backgroundColor: alphaHex(colors.black, 'D9') }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onCloseMediaPreview} />
          <View style={[styles.lightboxCard, { backgroundColor: colors.surface }]}>
            <View style={[styles.lightboxHead, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text variant="bodySmall" weight="bold" numberOfLines={2} style={{ color: colors.textPrimary, flex: 1 }}>
                {mediaPreview?.caption || t('academy.details.images')}
              </Text>
              <Pressable
                onPress={onCloseMediaPreview}
                style={({ pressed }) => [
                  styles.lightboxClose,
                  {
                    backgroundColor: alphaHex(colors.textPrimary, '12'),
                    opacity: pressed ? 0.84 : 1,
                  },
                ]}
              >
                <X size={20} color={colors.textPrimary} />
              </Pressable>
            </View>
            <SmartImage
              source={mediaPreview?.source}
              style={styles.lightboxImageWrap}
              imageStyle={styles.lightboxImage}
              borderRadius={16}
              showLoader={false}
            />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fallbackHeader: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  topBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 30,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  topBarRow: {
    alignItems: 'center',
    minHeight: 56,
    paddingHorizontal: H_PADDING,
  },
  topBarBack: {
    marginHorizontal: -spacing.sm,
  },
  topBarTitleWrap: {
    flex: 1,
    marginHorizontal: spacing.sm,
  },
  topBarAction: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroShell: {
    height: HERO_HEIGHT,
    overflow: 'hidden',
  },
  heroMedia: {
    ...StyleSheet.absoluteFillObject,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroFallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    paddingHorizontal: H_PADDING,
    justifyContent: 'space-between',
    paddingBottom: spacing.lg,
  },
  heroTopRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroTopIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBottomContent: {
    gap: spacing.md,
  },
  heroIdentityRow: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  heroLogoWrap: {
    width: 64,
    height: 64,
    borderRadius: 18,
    borderWidth: 1.2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  heroLogo: {
    width: '100%',
    height: '100%',
  },
  heroLogoImage: {
    width: '76%',
    height: '76%',
    marginLeft: '12%',
    marginTop: '12%',
  },
  heroRatingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  heroStatusRow: {
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  heroStatusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tabsSticky: {
    minHeight: TABS_STICKY_HEIGHT,
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabsContent: {
    paddingHorizontal: H_PADDING,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  tabChip: {
    marginHorizontal: spacing.xs,
  },
  content: {
    paddingHorizontal: H_PADDING,
    paddingTop: spacing.lg,
    gap: spacing['2xl'],
  },
  sectionBlock: {
    gap: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeaderRight: {
    marginLeft: spacing.sm,
  },
  sectionCard: {
    borderRadius: 22,
    padding: spacing.lg,
  },
  websiteRow: {
    marginTop: spacing.md,
    alignSelf: 'flex-start',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  infoCard: {
    width: '48%',
    minHeight: 108,
    borderRadius: 18,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    justifyContent: 'space-between',
  },
  infoIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  trustRows: {
    gap: spacing.sm,
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sportChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  sportBadge: {
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  secondaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  secondaryCard: {
    width: '48%',
    borderRadius: 16,
    padding: spacing.md,
  },
  courseCard: {
    borderRadius: 16,
    padding: spacing.md,
  },
  scheduleCard: {
    borderRadius: 16,
    padding: spacing.md,
  },
  galleryListContent: {
    paddingRight: H_PADDING,
    gap: spacing.sm,
  },
  galleryCard: {
    width: Math.round(SCREEN_WIDTH * 0.64),
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  galleryImageWrap: {
    width: '100%',
    height: 190,
  },
  galleryImage: {
    width: '100%',
    height: '100%',
  },
  galleryImageFallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryImageOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  galleryCaption: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    color: '#FFFFFF',
  },
  emptyCard: {
    borderRadius: 16,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  mapPreview: {
    borderWidth: 1,
    borderRadius: 20,
    overflow: 'hidden',
  },
  mapArt: {
    height: 110,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapPinBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapBody: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  mapActionWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  reviewCard: {
    borderRadius: 16,
    padding: spacing.md,
  },
  reviewHead: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewAvatar: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  reviewStars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 4,
  },
  similarList: {
    paddingRight: H_PADDING,
    gap: spacing.sm,
  },
  similarCard: {
    width: Math.round(SCREEN_WIDTH * 0.52),
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.sm,
  },
  similarImage: {
    width: '100%',
    height: 118,
  },
  contactButtons: {
    gap: spacing.sm,
  },
  contactBtn: {
    flex: 1,
  },
  footerOuter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: H_PADDING,
    zIndex: 20,
  },
  footerCard: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    paddingTop: spacing.sm,
  },
  footerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    minHeight: FOOTER_HEIGHT,
  },
  footerIconGroup: {
    gap: spacing.xs,
  },
  footerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerButtons: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  footerBtn: {
    flex: 1,
    minHeight: 44,
  },
  lightboxOuter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  lightboxCard: {
    width: '100%',
    maxWidth: 520,
    borderRadius: 22,
    padding: spacing.md,
  },
  lightboxHead: {
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  lightboxClose: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  lightboxImageWrap: {
    width: '100%',
    height: 320,
  },
  lightboxImage: {
    width: '100%',
    height: '100%',
  },
  skeletonContainer: {
    flex: 1,
  },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: spacing.sm,
  },
});
