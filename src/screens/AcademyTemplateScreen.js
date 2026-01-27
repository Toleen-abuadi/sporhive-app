// AcademyTemplateScreen.js - Modern Enhanced Version
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  ScrollView,
  Image,
  Pressable,
  StyleSheet,
  Dimensions,
  Linking,
  Share,
  Animated,
  Platform,
  Modal,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useI18n } from '../services/i18n/i18n';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import {
  Share2,
  MapPin,
  Phone,
  Mail,
  Sparkles,
  Star,
  Trophy,
  GraduationCap,
  Info,
  CalendarDays,
  Users,
  Navigation2,
  CheckCircle2,
  Flame,
  ShieldCheck,
  Award,
  Globe,
  ChevronRight,
  ExternalLink,
  Filter,
  X,
  Maximize2,
  Play,
  Camera,
  Image as ImageIcon,
  Clock,
  User,
  Target,
  Users as UsersIcon,
  Crown,
  Compass,
  BadgeCheck,
  Wallet,
  BookOpen,
  Heart,
  Bookmark,
  MessageCircle,
  Download,
  Eye,
} from 'lucide-react-native';

import { API_BASE_URL } from '../services/api/client';
import { useAcademyDiscoveryActions, useAcademyDiscoveryStore } from '../services/academyDiscovery/academyDiscovery.store';

import { useTheme } from '../theme/ThemeProvider';
import { spacing, borderRadius } from '../theme/tokens';

import { Screen } from '../components/ui/Screen';
import { Text } from '../components/ui/Text';
import { Button } from '../components/ui/Button';
import { BackButton } from '../components/ui/BackButton';
import { AppHeader } from '../components/ui/AppHeader';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { ErrorState } from '../components/ui/ErrorState';
import { SporHiveLoader } from '../components/ui/SporHiveLoader';
import { alphaHex } from '../theme/academyDiscovery.styles';

const { width: W, height: H } = Dimensions.get('window');
const HERO_H = Math.max(340, Math.min(440, Math.round(W * 0.92)));
const HEADER_H = 64;
const PADDING_X = 20;

// ========== HELPER FUNCTIONS ==========
function safeText(v) {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

function safeGradientColors(arr, fallback = []) {
  const fallbackA = fallback[0];
  const fallbackB = fallback[1] || fallbackA;
  const a = typeof arr?.[0] === 'string' && arr[0] ? arr[0] : fallbackA;
  const b = typeof arr?.[1] === 'string' && arr[1] ? arr[1] : a || fallbackB;
  return [a, b];
}

function safePoint(p, fallback) {
  const x = typeof p?.x === 'number' ? p.x : fallback.x;
  const y = typeof p?.y === 'number' ? p.y : fallback.y;
  return { x, y };
}

function normalizeArray(v) {
  return Array.isArray(v) ? v : [];
}

function getLocalized(i18n, en, ar) {
  const lang = (i18n?.language || 'en').toLowerCase();
  const isAr = lang.startsWith('ar');
  const primary = isAr ? ar : en;
  const fallback = isAr ? en : ar;
  return safeText(primary || fallback || '');
}

function dataUrlFromBase64({ mime, base64 }) {
  if (!base64 || base64 === null || base64 === undefined) return null;
  if (typeof base64 !== 'string') return null;
  if (base64.startsWith('data:') || base64.startsWith('http')) return base64;
  const m = mime || 'image/jpeg';
  return `data:${m};base64,${base64}`;
}

function toAbsoluteUrlMaybe(url, base) {
  if (!url) return null;
  const s = String(url);
  if (s.startsWith('http://') || s.startsWith('https://')) return s;
  if (s.startsWith('data:')) return s;
  if (!base) return s;
  return `${base.replace(/\/$/, '')}/${s.replace(/^\//, '')}`;
}

function academyImageUrl(base, slug, kind) {
  if (!base || !slug) return null;
  return `${base.replace(/\/$/, '')}/public/academies/image/${encodeURIComponent(slug)}/${kind}`;
}

function pickMediaSrc(item) {
  if (!item) return null;
  if (item.file_base64) return { base64: item.file_base64, mime: item.file_meta?.mime };
  if (item.media_base64) return { base64: item.media_base64, mime: item.media_meta?.mime };
  if (item.image_base64) return { base64: item.image_base64, mime: item.image_meta?.mime };
  if (item.poster_base64) return { base64: item.poster_base64, mime: item.poster_meta?.mime };
  return null;
}

// ========== UI COMPONENTS ==========
function GlassIconButton({ onPress, children, style }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [style, { opacity: pressed ? 0.85 : 1 }]}>
      <BlurView intensity={70} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={[alphaHex(colors.white, '26'), alphaHex(colors.white, '0D')]}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </Pressable>
  );
}

function SectionHeader({ icon, title, subtitle, right }) {
  const { colors, isDark } = useTheme();
  return (
    <View style={styles.sectionHeaderRow}>
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
        <LinearGradient
          colors={[
            alphaHex(colors.accentOrange, isDark ? '33' : '26'),
            alphaHex(colors.accentOrange, isDark ? '1A' : '0D'),
          ]}
          style={[styles.sectionIcon, { borderColor: colors.accentOrange }]}
        >
          {icon}
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text variant="h3" weight="bold" style={{ marginBottom: 4, color: colors.textPrimary }}>
            {title}
          </Text>
          {subtitle ? (
            <Text variant="bodySmall" color={colors.textSecondary} style={{ opacity: 0.85 }}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      {right ? <View style={{ marginLeft: 10 }}>{right}</View> : null}
    </View>
  );
}

function FeaturePill({ icon, label, value, color = 'orange' }) {
  const { colors, isDark } = useTheme();
  const toneMap = {
    orange: colors.accentOrange,
    amber: colors.warning || colors.accentOrange,
    yellow: colors.warning || colors.accentOrange,
    green: colors.success || colors.accentOrange,
  };
  const tone = toneMap[color] || colors.accentOrange;
  const gradientColors = safeGradientColors(null, [
    tone,
    alphaHex(tone, isDark ? 'B3' : '99'),
  ]);

  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.featurePill}
    >
      <View style={[styles.featurePillIcon, { backgroundColor: alphaHex(colors.white, '40') }]}>
        {icon}
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="caption" weight="medium" style={{ color: alphaHex(colors.white, 'E6') }}>
          {label}
        </Text>
        <Text variant="bodySmall" weight="bold" numberOfLines={1} style={{ color: colors.white, marginTop: 2 }}>
          {value}
        </Text>
      </View>
    </LinearGradient>
  );
}

function NavChip({ icon, label, onPress, isActive = false }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.navChip,
        {
          backgroundColor: isActive
            ? alphaHex(colors.white, '40')
            : pressed
              ? alphaHex(colors.white, '2E')
              : alphaHex(colors.white, '1F'),
          borderColor: isActive ? colors.accentOrange : alphaHex(colors.white, '38'),
          borderWidth: isActive ? 2 : 1,
        },
      ]}
    >
      {icon}
      <Text variant="caption" weight="medium" style={{
        color: isActive ? colors.accentOrange : colors.white,
        marginLeft: 8
      }}>
        {label}
      </Text>
    </Pressable>
  );
}

function MediaCarousel({ items, onOpen }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { colors } = useTheme();

  if (!items || items.length === 0) return null;

  const currentItem = items[currentIndex];
  const mediaSrc = dataUrlFromBase64({
    mime: currentItem?.file_meta?.mime,
    base64: currentItem?.file_base64
  });

  return (
    <View style={styles.carouselContainer}>
      <Pressable onPress={() => onOpen(currentItem)} style={styles.carouselImageContainer}>
        {mediaSrc ? (
          <Image source={{ uri: mediaSrc }} style={styles.carouselImage} resizeMode="cover" />
        ) : (
          <LinearGradient
            colors={[colors.accentOrange, alphaHex(colors.accentOrange, 'B3')]}
            style={styles.carouselFallback}
          >
            <Camera size={48} color={colors.white} />
          </LinearGradient>
        )}
        <LinearGradient
          colors={[
            alphaHex(colors.black, 'B3'),
            alphaHex(colors.black, '00'),
            alphaHex(colors.black, '00'),
            alphaHex(colors.black, 'B3'),
          ]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.carouselOverlay}>
          <Badge variant="accent" style={{ position: 'absolute', top: 12, right: 12 }}>
            <Maximize2 size={14} color={colors.white} />
          </Badge>
          <View style={{ position: 'absolute', bottom: 12, left: 12 }}>
            <Text variant="caption" weight="bold" style={{ color: colors.white }}>
              {currentIndex + 1} / {items.length}
            </Text>
          </View>
        </View>
      </Pressable>

      <View style={styles.carouselControls}>
        <Pressable
          onPress={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
          disabled={currentIndex === 0}
          style={[
            styles.carouselButton,
            { opacity: currentIndex === 0 ? 0.3 : 1, backgroundColor: alphaHex(colors.black, '33') },
          ]}
        >
          <ChevronRight size={20} color={colors.white} style={{ transform: [{ rotate: '180deg' }] }} />
        </Pressable>

        <View style={styles.carouselDots}>
          {items.map((_, idx) => (
            <Pressable
              key={idx}
              onPress={() => setCurrentIndex(idx)}
              style={[
                styles.carouselDot,
                {
                  backgroundColor: idx === currentIndex ? colors.accentOrange : alphaHex(colors.white, '4D'),
                  width: idx === currentIndex ? 20 : 8,
                },
              ]}
            />
          ))}
        </View>

        <Pressable
          onPress={() => setCurrentIndex(prev => Math.min(items.length - 1, prev + 1))}
          disabled={currentIndex === items.length - 1}
          style={[
            styles.carouselButton,
            { opacity: currentIndex === items.length - 1 ? 0.3 : 1, backgroundColor: alphaHex(colors.black, '33') },
          ]}
        >
          <ChevronRight size={20} color={colors.white} />
        </Pressable>
      </View>
    </View>
  );
}

function GalleryGrid({ items, onOpen, filter = 'all' }) {
  const { colors, isDark } = useTheme();
  const { t } = useI18n();

  const filteredItems = filter === 'all'
    ? items
    : items.filter(item => item.media_type === filter);

  if (filteredItems.length === 0) {
    return (
      <View style={styles.emptyGallery}>
        <ImageIcon size={48} color={colors.textSecondary} />
        <Text variant="body" color={colors.textSecondary} style={{ marginTop: 12 }}>
          {t('service.academy.template.media.empty')}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.galleryGrid}>
      {filteredItems.slice(0, 8).map((item, idx) => {
        const mediaSrc = dataUrlFromBase64({
          mime: item?.file_meta?.mime,
          base64: item?.file_base64
        });

        return (
          <Pressable
            key={idx}
            onPress={() => onOpen(item)}
            style={({ pressed }) => [
              styles.galleryItem,
              { opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
            ]}
          >
            {mediaSrc ? (
              <Image source={{ uri: mediaSrc }} style={styles.galleryImage} resizeMode="cover" />
            ) : (
              <LinearGradient
                colors={
                  isDark
                    ? [alphaHex(colors.white, '1A'), alphaHex(colors.white, '0D')]
                    : [alphaHex(colors.black, '0D'), alphaHex(colors.black, '05')]
                }
                style={styles.galleryFallback}
              >
                <Camera size={24} color={colors.textSecondary} />
              </LinearGradient>
            )}
            <LinearGradient
              colors={[alphaHex(colors.black, '00'), alphaHex(colors.black, 'B3')]}
              style={styles.galleryOverlay}
            />
            <Text
              variant="caption"
              weight="medium"
              style={[styles.galleryCaption, { color: colors.white }]}
              numberOfLines={2}
            >
              {item.caption_en || item.caption_ar || t('service.academy.template.media.itemFallback')}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function CourseCard({ course, i18n, t }) {
  const { colors, isDark } = useTheme();
  const title = getLocalized(i18n, course?.name_en, course?.name_ar) || t('service.academy.template.course.defaultTitle');
  const emptyValue = t('service.academy.common.emptyValue');
  const schedules = normalizeArray(course?.schedules);
  const coaches = normalizeArray(course?.coaches);
  const posterSrc = dataUrlFromBase64({
    mime: course?.poster_meta?.mime,
    base64: course?.poster_base64
  });

  const dayLabel = (d) => {
    if (d === 0) return t('service.academy.template.schedule.days.sunday');
    if (d === 1) return t('service.academy.template.schedule.days.monday');
    if (d === 2) return t('service.academy.template.schedule.days.tuesday');
    if (d === 3) return t('service.academy.template.schedule.days.wednesday');
    if (d === 4) return t('service.academy.template.schedule.days.thursday');
    if (d === 5) return t('service.academy.template.schedule.days.friday');
    return t('service.academy.template.schedule.days.saturday');
  };

  return (
    <Card elevation={3} style={[styles.courseCard, { marginBottom: 16 }]}>
      <LinearGradient
        colors={
          isDark
            ? [alphaHex(colors.surfaceElevated || colors.surface, '0D'), alphaHex(colors.surfaceElevated || colors.surface, '08')]
            : [alphaHex(colors.surfaceElevated || colors.surface, 'E6'), alphaHex(colors.surfaceElevated || colors.surface, 'B3')]
        }
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.courseCardInner}>
        {posterSrc && (
          <View style={styles.courseImageContainer}>
            <Image source={{ uri: posterSrc }} style={styles.courseImage} resizeMode="cover" />
            <LinearGradient
              colors={[alphaHex(colors.black, '66'), alphaHex(colors.black, '00')]}
              style={styles.courseImageOverlay}
            />
            {course?.is_featured && (
              <Badge variant="accent" style={styles.featuredBadge}>
                <Star size={12} color={colors.white} />
                <Text variant="caption" weight="bold" style={{ color: colors.white, marginLeft: 4 }}>
                  {t('service.academy.template.badges.featured')}
                </Text>
              </Badge>
            )}
          </View>
        )}

        <View style={styles.courseContent}>
          <View style={styles.courseHeader}>
            <View style={{ flex: 1 }}>
              <Text variant="h4" weight="bold" numberOfLines={2} style={{ marginBottom: 8 }}>
                {title}
              </Text>

              <View style={styles.courseMeta}>
                {(course?.age_from != null || course?.age_to != null) && (
                  <View style={styles.metaItem}>
                    <Users size={14} color={colors.textSecondary} />
                    <Text variant="caption" style={{ marginLeft: 6, color: colors.textSecondary }}>
                      {course?.age_from ?? emptyValue}–{course?.age_to ?? emptyValue} {t('service.academy.template.course.years')}
                    </Text>
                  </View>
                )}

                {safeText(course?.level) && (
                  <View style={styles.metaItem}>
                    <Target size={14} color={colors.textSecondary} />
                    <Text variant="caption" style={{ marginLeft: 6, color: colors.textSecondary }}>
                      {safeText(course.level)}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {coaches.length > 0 && (
            <View style={styles.courseSection}>
              <Text variant="bodySmall" weight="medium" style={{ marginBottom: 8, color: colors.textPrimary }}>
                {t('service.academy.template.course.coaches')}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {coaches.slice(0, 8).map((c, idx) => (
                    <View
                      key={`${c}-${idx}`}
                      style={[
                        styles.coachChip,
                        {
                          backgroundColor: isDark
                            ? alphaHex(colors.white, '14')
                            : alphaHex(colors.black, '0A'),
                        },
                      ]}
                    >
                      <User size={12} color={colors.textSecondary} />
                      <Text variant="caption" style={{ marginLeft: 4, color: colors.textSecondary }}>
                        {safeText(c) || t('service.academy.template.course.unknownCoach')}
                      </Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {schedules.length > 0 && (
            <View style={styles.courseSection}>
              <Text variant="bodySmall" weight="medium" style={{ marginBottom: 8, color: colors.textPrimary }}>
                {t('service.academy.template.course.schedule')}
              </Text>
              <View style={{ gap: 10 }}>
                {schedules.slice(0, 4).map((s, idx) => (
                  <View key={idx} style={[styles.scheduleItem, { borderBottomColor: alphaHex(colors.border, '33') }]}>
                    <CalendarDays size={16} color={colors.accentOrange} />
                    <Text variant="caption" weight="medium" style={{ marginLeft: 8, color: colors.textPrimary }}>
                      {dayLabel(s?.day_of_week)}
                    </Text>
                    <Text variant="caption" style={{ marginLeft: 'auto', color: colors.textSecondary }}>
                      {safeText(s?.start_time).slice(0, 5)}–{safeText(s?.end_time).slice(0, 5)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </View>
    </Card>
  );
}

function SuccessStoryCard({ story, i18n, t, onOpen }) {
  const { colors, isDark } = useTheme();
  const title = getLocalized(i18n, story?.title_en, story?.title_ar) ||
    getLocalized(i18n, story?.name_en, story?.name_ar) ||
    t('service.academy.template.story.defaultTitle');

  const content = getLocalized(i18n, story?.content_en, story?.content_ar) ||
    getLocalized(i18n, story?.description_en, story?.description_ar) || '';

  const mediaSrc = dataUrlFromBase64({
    mime: story?.file_meta?.mime,
    base64: story?.file_base64
  });

  return (
    <Card elevation={3} style={[styles.successStoryCard, { marginBottom: 16 }]}>
      <LinearGradient
        colors={[
          alphaHex(colors.accentOrange, isDark ? '1A' : '14'),
          alphaHex(colors.accentOrange, isDark ? '0D' : '08'),
        ]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.successStoryContent}>
        <View style={styles.successStoryHeader}>
          <Award size={24} color={colors.accentOrange} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text variant="h4" weight="bold" style={{ marginBottom: 4 }}>
              {t('service.academy.template.story.title')}
            </Text>
            <Text variant="bodySmall" color={colors.textSecondary}>
              {t('service.academy.template.story.subtitle')}
            </Text>
          </View>
        </View>

        <Text variant="h3" weight="bold" style={{ marginVertical: 16 }}>
          {title}
        </Text>

        {content ? (
          <Text variant="body" style={{ lineHeight: 24, color: colors.textSecondary, marginBottom: 16 }}>
            {content.length > 200 ? `${content.substring(0, 200)}...` : content}
          </Text>
        ) : null}

        <View style={{ flexDirection: 'row', gap: 12 }}>
          {mediaSrc && (
            <Pressable onPress={() => onOpen(story)} style={{ flex: 1 }}>
              <Image source={{ uri: mediaSrc }} style={styles.storyImage} resizeMode="cover" />
              <LinearGradient
                colors={[alphaHex(colors.black, '4D'), alphaHex(colors.black, '00')]}
                style={styles.storyImageOverlay}
              />
            </Pressable>
          )}

          <View style={{ flex: 1, justifyContent: 'center' }}>
            <Button
              variant="secondary"
              onPress={() => onOpen(story)}
              leftIcon={<Maximize2 size={16} color={colors.white} />}
              style={{ alignSelf: 'flex-start' }}
            >
              {t('service.academy.template.story.view')}
            </Button>
          </View>
        </View>
      </View>
    </Card>
  );
}

// ========== MAIN SCREEN ==========
export function AcademyTemplateScreen({ slug }) {
  const router = useRouter();
  const { t, i18n } = useI18n();
  const { colors, isDark } = useTheme();
  const separator = t('service.academy.common.separator');

  const { detailsBySlug, detailsLoadingBySlug, detailsErrorBySlug } = useAcademyDiscoveryStore((state) => ({
    detailsBySlug: state.detailsBySlug,
    detailsLoadingBySlug: state.detailsLoadingBySlug,
    detailsErrorBySlug: state.detailsErrorBySlug,
  }));
  const discoveryActions = useAcademyDiscoveryActions();
  const [activeSection, setActiveSection] = useState('about');
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [lightboxItem, setLightboxItem] = useState(null);
  const [mediaFilter, setMediaFilter] = useState('all');

  const enter = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef(null);
  const sectionsY = useRef({});
  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: 520,
      useNativeDriver: true,
    }).start();
  }, []);

  const payload = slug ? detailsBySlug?.[slug] : null;
  const loading = slug ? detailsLoadingBySlug?.[slug] : false;
  const error = slug ? detailsErrorBySlug?.[slug] : '';
  const resolvedError = slug ? error : t('service.academy.common.notFound');

  const academy = payload?.academy || null;
  const templateSections = payload?.template_sections || {};
  const courses = payload?.courses || [];
  const mediaByType = payload?.media_by_type || {};
  const successStory = payload?.success_story || null;

  // Academy data
  const academyName = useMemo(() => {
    if (!academy) return '';
    return (
      getLocalized(i18n, academy?.name_en, academy?.name_ar) ||
      safeText(academy?.name) ||
      t('service.academy.common.defaultName')
    );
  }, [academy, i18n, t]);

  const aboutText = useMemo(() => {
    return getLocalized(i18n, academy?.short_desc_en, academy?.short_desc_ar) || '';
  }, [academy, i18n]);

  const sportTypes = useMemo(() => normalizeArray(academy?.sport_types), [academy]);
  const contactPhones = useMemo(() => normalizeArray(academy?.contact_phones), [academy]);
  const awards = useMemo(() => normalizeArray(academy?.awards), [academy]);
  const certificates = useMemo(() => normalizeArray(academy?.certificates), [academy]);
  const languages = useMemo(() => normalizeArray(academy?.languages), [academy]);
  const yearFounded = academy?.year_founded;
  const website = academy?.website;

  // Media data
  const ads = useMemo(() => normalizeArray(mediaByType?.ad), [mediaByType]);
  const galleryItems = useMemo(() => {
    const galleryTypes = ['team', 'poster', 'championship', 'certificate', 'other'];
    return galleryTypes.flatMap(type => normalizeArray(mediaByType?.[type]));
  }, [mediaByType]);

  // Image URLs
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

  // Map URL
  const mapUrl = useMemo(() => {
    if (academy?.lat != null && academy?.lng != null)
      return `https://www.google.com/maps?q=${academy.lat},${academy.lng}`;
    const addr = safeText(academy?.address);
    if (addr) return `https://www.google.com/maps?q=${encodeURIComponent(addr)}`;
    return '';
  }, [academy]);

  // Load data
  const load = useCallback(async () => {
    if (!slug) return;
    await discoveryActions.fetchDetails(slug);
  }, [discoveryActions, slug]);

  useEffect(() => {
    if (!slug) return;
    load();
  }, [load, slug]);

  // Animation handlers
  const scrollHandler = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: false }
  );

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 40, 120],
    outputRange: [0, 0.55, 1],
    extrapolate: 'clamp',
  });

  const heroParallax = scrollY.interpolate({
    inputRange: [-HERO_H, 0, HERO_H],
    outputRange: [-HERO_H * 0.45, 0, HERO_H * 0.18],
    extrapolate: 'clamp',
  });

  const heroScale = scrollY.interpolate({
    inputRange: [-HERO_H, 0, HERO_H],
    outputRange: [1.35, 1, 1],
    extrapolate: 'clamp',
  });

  // Navigation
  const jumpTo = useCallback((key) => {
    const y = sectionsY.current?.[key];
    if (y == null) return;
    setActiveSection(key);
    scrollRef.current?.scrollTo({ y: Math.max(0, y - HEADER_H - 10), animated: true });
  }, []);

  // Actions
  const onShare = useCallback(async () => {
    try {
      await Share.share({
        message: t('service.academy.template.shareMessage', {
          academyName,
          mapUrl: mapUrl || '',
        }).trim(),
      });
    } catch {
      // ignore
    }
  }, [academyName, mapUrl, t]);

  const onCall = useCallback(() => {
    const phone = contactPhones?.[0];
    if (!phone) return;
    Linking.openURL(`tel:${phone}`);
  }, [contactPhones]);

  const onEmail = useCallback(() => {
    const email = safeText(academy?.contact_email);
    if (!email) return;
    Linking.openURL(`mailto:${email}`);
  }, [academy]);

  const onOpenMaps = useCallback(() => {
    if (!mapUrl) return;
    Linking.openURL(mapUrl);
  }, [mapUrl]);

  const onOpenWebsite = useCallback(() => {
    if (!website) return;
    Linking.openURL(website.startsWith('http') ? website : `https://${website}`);
  }, [website]);

  const onPrimary = useCallback(() => {
    if (!academy?.slug) return;

    if (academy?.registration_enabled && academy?.registration_open) {
      router.push(`/academies/${academy.slug}/join`);
      return;
    }

    jumpTo('contact');
  }, [academy, jumpTo, router]);

  const openLightbox = useCallback((item) => {
    setLightboxItem(item);
    setLightboxVisible(true);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxVisible(false);
    setLightboxItem(null);
  }, []);

  // Navigation items
  const navItems = useMemo(() => {
    const items = [];
    if (templateSections.about && aboutText) {
      items.push({
        key: 'about',
        label: t('service.academy.template.nav.about'),
        icon: <Info size={16} color={colors.white} />,
      });
    }
    if (templateSections.stats && (sportTypes.length > 0 || awards.length > 0 || certificates.length > 0)) {
      items.push({
        key: 'sports',
        label: t('service.academy.template.nav.sports'),
        icon: <Trophy size={16} color={colors.white} />,
      });
    }
    if (templateSections.courses && courses.length > 0) {
      items.push({
        key: 'courses',
        label: t('service.academy.template.nav.courses'),
        icon: <GraduationCap size={16} color={colors.white} />,
      });
    }
    if ((templateSections.media_ads || templateSections.media_gallery) && (ads.length > 0 || galleryItems.length > 0)) {
      items.push({
        key: 'media',
        label: t('service.academy.template.nav.media'),
        icon: <ImageIcon size={16} color={colors.white} />,
      });
    }
    if (templateSections.success_story && successStory) {
      items.push({
        key: 'story',
        label: t('service.academy.template.nav.story'),
        icon: <Award size={16} color={colors.white} />,
      });
    }
    if (templateSections.location) {
      items.push({
        key: 'location',
        label: t('service.academy.template.nav.location'),
        icon: <MapPin size={16} color={colors.white} />,
      });
    }
    items.push({ key: 'contact', label: t('service.academy.template.nav.contact'), icon: <Mail size={16} color={colors.white} /> });
    return items;
  }, [ads, awards, colors.white, courses, galleryItems, successStory, sportTypes, templateSections, aboutText, certificates, t]);

  // Lightbox source
  const lightboxSrc = useMemo(() => {
    if (!lightboxItem) return null;
    const media = pickMediaSrc(lightboxItem);
    return dataUrlFromBase64({ mime: media?.mime, base64: media?.base64 });
  }, [lightboxItem]);

  // Loading state
  if (loading) {
    return (
      <Screen safe>
        <AppHeader title={t('service.academy.template.loading.title')} leftSlot={<BackButton />} />
        <SporHiveLoader
          label={t('service.academy.template.loading.title')}
          message={t('service.academy.template.loading.subtitle')}
        />
      </Screen>
    );
  }

  // Error state
  if (resolvedError) {
    return (
      <Screen safe>
        <AppHeader title={t('service.academy.template.error.title')} leftSlot={<BackButton />} />
        <ErrorState
          title={t('service.academy.template.error.title')}
          subtitle={resolvedError}
          actionLabel={t('service.academy.template.error.retry')}
          onAction={load}
        />
      </Screen>
    );
  }

  return (
    <Screen safe style={{ backgroundColor: colors.background }}>
      {/* Modern glass header */}
      <Animated.View
        style={[
          styles.topBar,
          {
            borderBottomColor: colors.border,
            opacity: headerOpacity,
            backgroundColor: alphaHex(colors.surface, isDark ? 'D9' : 'EB'),
          },
        ]}
      >
        <BlurView intensity={80} style={StyleSheet.absoluteFill} />
        <View style={styles.topBarInner}>
          <BackButton color={colors.textPrimary} style={styles.topIconBtn} />

          <View style={{ flex: 1, marginHorizontal: 10 }}>
            <Text variant="body" weight="bold" numberOfLines={1} style={{ color: colors.textPrimary }}>
              {academyName}
            </Text>
            {academy?.city && (
              <Text variant="caption" color={colors.textSecondary} numberOfLines={1}>
                {safeText(academy.city)}
              </Text>
            )}
          </View>

          <Pressable onPress={onShare} style={({ pressed }) => [styles.topIconBtn, { opacity: pressed ? 0.7 : 1 }]}>
            <Share2 size={20} color={colors.textPrimary} />
          </Pressable>
        </View>
      </Animated.View>

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 180 }}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(event) => {
          const offsetY = event.nativeEvent.contentOffset.y;
          // Determine active section based on scroll position
          Object.entries(sectionsY.current).forEach(([key, y]) => {
            if (offsetY >= y - HEADER_H - 50) {
              setActiveSection(key);
            }
          });
        }}
      >
        {/* HERO SECTION */}
        <View style={styles.heroWrap}>
          <Animated.View style={[styles.heroMedia, { transform: [{ translateY: heroParallax }, { scale: heroScale }] }]}>
            {coverSource ? (
              <Image source={coverSource} style={styles.heroImg} resizeMode="cover" />
            ) : (
              <LinearGradient
                colors={[colors.accentOrange, alphaHex(colors.accentOrange, 'B3')]}
                start={{ x: 0.1, y: 0.0 }}
                end={{ x: 0.9, y: 1.0 }}
                style={styles.heroImg}
              />
            )}

            {/* Smart readability overlays (top light / bottom strong) */}
            <LinearGradient
              colors={[
                alphaHex(colors.black, '55'), // top: light shade so header icons pop
                alphaHex(colors.black, '15'),
                alphaHex(colors.black, 'A8'), // bottom: strong shade for title/chips
              ]}
              locations={[0, 0.45, 1]}
              style={StyleSheet.absoluteFill}
            />

            {/* subtle brand tint, not competing with text */}
            <LinearGradient
              colors={[
                alphaHex(colors.accentOrange, '22'),
                alphaHex(colors.accentOrange, '00'),
                alphaHex(colors.accentOrange, '14'),
              ]}
              locations={[0, 0.6, 1]}
              style={StyleSheet.absoluteFill}
            />

            {/* optional: add a soft vignette for better edges */}
            <View pointerEvents="none" style={styles.heroVignette} />

          </Animated.View>

          <Animated.View
            style={[
              styles.heroContent,
              {
                opacity: enter,
                transform: [
                  {
                    translateY: enter.interpolate({
                      inputRange: [0, 1],
                      outputRange: [18, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            {/* Badges + actions */}
            <View style={styles.heroTopRow}>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                {academy?.is_pro ? (
                  <Badge variant="primary" style={styles.badgeRow}>
                    <Crown size={14} color={colors.white} />
                    <Text variant="caption" weight="bold" style={[styles.badgeText, { color: colors.white }]}>
                      {t('service.academy.template.badges.pro')}
                    </Text>
                  </Badge>
                ) : null}
                {academy?.is_featured ? (
                  <Badge variant="accent" style={styles.badgeRow}>
                    <Flame size={14} color={colors.white} />
                    <Text variant="caption" weight="bold" style={[styles.badgeText, { color: colors.white }]}>
                      {t('service.academy.template.badges.featured')}
                    </Text>
                  </Badge>
                ) : null}
                {academy?.has_facilities_booking ? (
                  <Badge variant="secondary" style={styles.badgeRow}>
                    <CheckCircle2 size={14} color={colors.white} />
                    <Text variant="caption" weight="bold" style={[styles.badgeText, { color: colors.white }]}>
                      {t('service.academy.template.badges.facilities')}
                    </Text>
                  </Badge>
                ) : null}
              </View>

              <GlassIconButton onPress={onShare} style={[styles.heroActionBtn, { borderColor: alphaHex(colors.white, '47') }]}>
                <Share2 size={18} color={colors.white} />
              </GlassIconButton>
            </View>

            {/* Title area */}
            <View style={styles.heroTitleRow}>
              {logoSource ? (
                <View style={[styles.logoBox, { borderColor: alphaHex(colors.white, '47') }]}>
                  <BlurView intensity={40} style={StyleSheet.absoluteFill} />
                  <Image source={logoSource} style={styles.logoImg} resizeMode="contain" />
                </View>
              ) : (
                <View style={[styles.logoBox, { borderColor: alphaHex(colors.white, '47') }]}>
                  <BlurView intensity={40} style={StyleSheet.absoluteFill} />
                  <Sparkles size={22} color={colors.white} />
                </View>
              )}

              <View style={{ flex: 1 }}>
                <Text variant="h1" weight="bold" style={[styles.heroTitle, { color: colors.white }]} numberOfLines={2}>
                  {academyName}
                </Text>

                <View style={styles.heroSubRow}>
                  <MapPin size={16} color={alphaHex(colors.white, 'E6')} />
                  <Text variant="bodySmall" style={[styles.heroSub, { color: alphaHex(colors.white, 'E0') }]} numberOfLines={1}>
                    {safeText(academy?.city || '')}
                    {academy?.city && academy?.address ? separator : ''}
                    {safeText(academy?.address || '')}
                  </Text>
                </View>

                {academy?.registration_open !== undefined && (
                  <View style={[styles.statusBadge, {
                    backgroundColor: academy.registration_open
                      ? alphaHex(colors.success, '33')
                      : alphaHex(colors.error, '33'),
                    borderColor: academy.registration_open ? colors.success : colors.error,
                  }]}>
                    <Text variant="caption" weight="bold" style={{
                      color: academy.registration_open ? colors.success : colors.error,
                    }}>
                      {academy.registration_open
                        ? t('service.academy.template.status.registrationOpen')
                        : t('service.academy.template.status.registrationClosed')}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Feature pills */}
            <View style={styles.featureRow}>
              {academy?.ages_from != null && academy?.ages_to != null ? (
                <FeaturePill
                  icon={<Users size={18} color={colors.white} />}
                  label={t('service.academy.template.feature.ageRange')}
                  value={`${academy.ages_from}-${academy.ages_to} ${t('service.academy.template.feature.years')}`}
                  color="orange"
                />
              ) : null}

              {sportTypes.length > 0 ? (
                <FeaturePill
                  icon={<Trophy size={18} color={colors.white} />}
                  label={t('service.academy.template.feature.sports')}
                  value={`${sportTypes.length} ${sportTypes.length === 1
                    ? t('service.academy.template.feature.sportSingle')
                    : t('service.academy.template.feature.sportPlural')
                    }`}
                  color="amber"
                />
              ) : null}

              {academy?.subscription_fee_amount ? (
                <FeaturePill
                  icon={<Wallet size={18} color={colors.white} />}
                  label={t('service.academy.template.feature.startingFrom')}
                  value={`${academy.subscription_fee_amount} ${safeText(academy?.subscription_fee_type) || t('service.academy.template.feature.perMonth')}`}
                  color="yellow"
                />
              ) : null}

              {academy?.has_facilities_booking ? (
                <FeaturePill
                  icon={<CalendarDays size={18} color={colors.white} />}
                  label={t('service.academy.template.feature.facilities')}
                  value={t('service.academy.template.feature.bookingAvailable')}
                  color="green"
                />
              ) : null}
            </View>

            {/* Navigation chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginHorizontal: -PADDING_X }}
              contentContainerStyle={{ paddingHorizontal: PADDING_X }}
            >
              <View style={{ flexDirection: 'row', paddingTop: 4, gap: 8 }}>
                {navItems.map((it) => (
                  <NavChip
                    key={it.key}
                    icon={it.icon}
                    label={it.label}
                    onPress={() => jumpTo(it.key)}
                    isActive={activeSection === it.key}
                  />
                ))}
              </View>
            </ScrollView>
          </Animated.View>
        </View>

        {/* CONTENT SECTIONS */}
        <View style={{ paddingHorizontal: PADDING_X, paddingTop: 24 }}>
          {/* About Section */}
          {templateSections.about && aboutText ? (
            <View
              onLayout={(e) => (sectionsY.current.about = e.nativeEvent.layout.y)}
              style={{ marginBottom: 32 }}
            >
              <SectionHeader
                icon={<Info size={18} color={colors.accentOrange} />}
                title={t('service.academy.template.sections.about.title')}
                subtitle={t('service.academy.template.sections.about.subtitle')}
              />

              <Card elevation={3} style={[styles.sectionCard, { shadowColor: colors.black }]}>
                <View style={styles.sectionCardContent}>
                  <Text style={{ lineHeight: 24, fontSize: 16, color: colors.textPrimary }}>
                    {aboutText}
                  </Text>

                  {(yearFounded || website) && (
                    <View style={styles.aboutMeta}>
                      {yearFounded && (
                        <View style={styles.metaRow}>
                          <CalendarDays size={16} color={colors.textSecondary} />
                          <Text variant="body" style={{ marginLeft: 8, color: colors.textPrimary }}>
                            {t('service.academy.template.about.founded')}: {yearFounded}
                          </Text>
                        </View>
                      )}

                      {website && (
                        <Pressable
                          onPress={onOpenWebsite}
                          style={[styles.websiteButton, { backgroundColor: alphaHex(colors.accentOrange, '1A') }]}
                        >
                          <Globe size={16} color={colors.accentOrange} />
                          <Text variant="body" weight="medium" style={{ marginLeft: 8, color: colors.accentOrange }}>
                            {t('service.academy.template.about.visitWebsite')}
                          </Text>
                          <ExternalLink size={14} color={colors.accentOrange} style={{ marginLeft: 4 }} />
                        </Pressable>
                      )}
                    </View>
                  )}

                  {languages.length > 0 && (
                    <View style={[styles.languagesSection, { borderTopColor: alphaHex(colors.border, '33') }]}>
                      <Text variant="bodySmall" weight="medium" style={{ marginBottom: 12, color: colors.textPrimary }}>
                        {t('service.academy.template.about.languages')}
                      </Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        {languages.slice(0, 6).map((lang, idx) => (
                          <Badge
                            key={idx}
                            variant="outline"
                            style={{
                              backgroundColor: isDark
                                ? alphaHex(colors.white, '0D')
                                : alphaHex(colors.black, '05'),
                            }}
                          >
                            <Text variant="caption" style={{ color: colors.textPrimary }}>
                              {lang}
                            </Text>
                          </Badge>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              </Card>
            </View>
          ) : null}

          {/* Sports & Stats Section */}
          {templateSections.stats && (sportTypes.length > 0 || awards.length > 0 || certificates.length > 0) ? (
            <View
              onLayout={(e) => (sectionsY.current.sports = e.nativeEvent.layout.y)}
              style={{ marginBottom: 32 }}
            >
              <SectionHeader
                icon={<Trophy size={18} color={colors.accentOrange} />}
                title={t('service.academy.template.sections.sports.title')}
                subtitle={t('service.academy.template.sections.sports.subtitle')}
                right={sportTypes.length > 0 ? <Badge variant="accent">{sportTypes.length}</Badge> : null}
              />

              <Card elevation={3} style={[styles.sectionCard, { shadowColor: colors.black }]}>
                <View style={styles.sectionCardContent}>
                  {/* Sports Grid */}
                  {sportTypes.length > 0 && (
                    <View style={{ marginBottom: 24 }}>
                      <Text variant="body" weight="medium" style={{ marginBottom: 16, color: colors.textPrimary }}>
                        {t('service.academy.template.sports.offered')}
                      </Text>
                      <View style={styles.sportsGrid}>
                        {sportTypes.map((sport, idx) => (
                          <View key={`${sport}-${idx}`} style={styles.sportItem}>
                            <LinearGradient
                              colors={[
                                alphaHex(colors.accentOrange, isDark ? '33' : '26'),
                                alphaHex(colors.accentOrange, isDark ? '1A' : '0D'),
                              ]}
                              style={styles.sportIcon}
                            >
                              <Trophy size={22} color={colors.accentOrange} />
                            </LinearGradient>
                            <Text weight="medium" style={{ marginTop: 8, textTransform: 'capitalize', color: colors.textPrimary }}>
                              {safeText(sport)}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Stats */}
                  <View style={{ marginBottom: 24 }}>
                    <Text variant="body" weight="medium" style={{ marginBottom: 16, color: colors.textPrimary }}>
                      {t('service.academy.template.stats.title')}
                    </Text>
                    <View style={styles.statsGrid}>
                      {academy?.number_of_players != null && (
                        <View style={[styles.statItem, { backgroundColor: alphaHex(colors.textPrimary, isDark ? '0D' : '05') }]}>
                          <Users size={20} color={colors.accentOrange} />
                          <Text variant="h3" weight="bold" style={{ marginTop: 8, color: colors.textPrimary }}>
                            {academy.number_of_players}
                          </Text>
                          <Text variant="caption" color={colors.textSecondary}>
                            {t('service.academy.template.stats.players')}
                          </Text>
                        </View>
                      )}

                      {academy?.number_of_coaches != null && (
                        <View style={[styles.statItem, { backgroundColor: alphaHex(colors.textPrimary, isDark ? '0D' : '05') }]}>
                          <User size={20} color={colors.accentOrange} />
                          <Text variant="h3" weight="bold" style={{ marginTop: 8, color: colors.textPrimary }}>
                            {academy.number_of_coaches}
                          </Text>
                          <Text variant="caption" color={colors.textSecondary}>
                            {t('service.academy.template.stats.coaches')}
                          </Text>
                        </View>
                      )}

                      {awards.length > 0 && (
                        <View style={[styles.statItem, { backgroundColor: alphaHex(colors.textPrimary, isDark ? '0D' : '05') }]}>
                          <Award size={20} color={colors.accentOrange} />
                          <Text variant="h3" weight="bold" style={{ marginTop: 8, color: colors.textPrimary }}>
                            {awards.length}
                          </Text>
                          <Text variant="caption" color={colors.textSecondary}>
                            {t('service.academy.template.stats.awards')}
                          </Text>
                        </View>
                      )}

                      {certificates.length > 0 && (
                        <View style={[styles.statItem, { backgroundColor: alphaHex(colors.textPrimary, isDark ? '0D' : '05') }]}>
                          <BadgeCheck size={20} color={colors.accentOrange} />
                          <Text variant="h3" weight="bold" style={{ marginTop: 8, color: colors.textPrimary }}>
                            {certificates.length}
                          </Text>
                          <Text variant="caption" color={colors.textSecondary}>
                            {t('service.academy.template.stats.certificates')}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Awards & Certificates */}
                  {(awards.length > 0 || certificates.length > 0) && (
                    <View>
                      <Text variant="body" weight="medium" style={{ marginBottom: 16, color: colors.textPrimary }}>
                        {t('service.academy.template.stats.achievements')}
                      </Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        {awards.slice(0, 4).map((award, idx) => (
                          <Badge key={idx} variant="accent">
                            <Award size={12} color={colors.white} />
                            <Text variant="caption" weight="medium" style={{ color: colors.white, marginLeft: 4 }}>
                              {award}
                            </Text>
                          </Badge>
                        ))}
                        {certificates.slice(0, 4).map((cert, idx) => (
                          <Badge key={idx} variant="secondary">
                            <BadgeCheck size={12} color={colors.white} />
                            <Text variant="caption" weight="medium" style={{ color: colors.white, marginLeft: 4 }}>
                              {cert}
                            </Text>
                          </Badge>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              </Card>
            </View>
          ) : null}

          {/* Courses Section */}
          {templateSections.courses && courses.length > 0 ? (
            <View
              onLayout={(e) => (sectionsY.current.courses = e.nativeEvent.layout.y)}
              style={{ marginBottom: 32 }}
            >
              <SectionHeader
                icon={<GraduationCap size={18} color={colors.accentOrange} />}
                title={t('service.academy.template.sections.courses.title')}
                subtitle={t('service.academy.template.sections.courses.subtitle')}
                right={<Badge variant="primary">{courses.length}</Badge>}
              />

              <View style={{ marginTop: 16 }}>
                {courses.map((c, idx) => (
                  <CourseCard key={c?.id || idx} course={c} i18n={i18n} t={t} />
                ))}
              </View>
            </View>
          ) : null}

          {/* Media Section */}
          {(templateSections.media_ads || templateSections.media_gallery) && (ads.length > 0 || galleryItems.length > 0) ? (
            <View
              onLayout={(e) => (sectionsY.current.media = e.nativeEvent.layout.y)}
              style={{ marginBottom: 32 }}
            >
              <SectionHeader
                icon={<ImageIcon size={18} color={colors.accentOrange} />}
                title={t('service.academy.template.sections.media.title')}
                subtitle={t('service.academy.template.sections.media.subtitle')}
                right={
                  galleryItems.length > 0 ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Badge variant="outline" style={{ marginRight: 8 }}>
                        <Filter size={12} color={colors.textSecondary} />
                      </Badge>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ width: 120 }}>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <Pressable onPress={() => setMediaFilter('all')}>
                            <Text variant="caption" weight={mediaFilter === 'all' ? 'bold' : 'normal'}
                              style={{ color: mediaFilter === 'all' ? colors.accentOrange : colors.textSecondary }}>
                              {t('service.academy.template.media.filters.all')}
                            </Text>
                          </Pressable>
                          <Pressable onPress={() => setMediaFilter('team')}>
                            <Text variant="caption" weight={mediaFilter === 'team' ? 'bold' : 'normal'}
                              style={{ color: mediaFilter === 'team' ? colors.accentOrange : colors.textSecondary }}>
                              {t('service.academy.template.media.filters.team')}
                            </Text>
                          </Pressable>
                          <Pressable onPress={() => setMediaFilter('poster')}>
                            <Text variant="caption" weight={mediaFilter === 'poster' ? 'bold' : 'normal'}
                              style={{ color: mediaFilter === 'poster' ? colors.accentOrange : colors.textSecondary }}>
                              {t('service.academy.template.media.filters.posters')}
                            </Text>
                          </Pressable>
                        </View>
                      </ScrollView>
                    </View>
                  ) : null
                }
              />

              {ads.length > 0 && (
                <Card elevation={3} style={[styles.sectionCard, { marginBottom: 24, shadowColor: colors.black }]}>
                  <View style={styles.sectionCardContent}>
                    <Text variant="body" weight="medium" style={{ marginBottom: 16, color: colors.textPrimary }}>
                      {t('service.academy.template.media.adsTitle')}
                    </Text>
                    <MediaCarousel items={ads} onOpen={openLightbox} />
                  </View>
                </Card>
              )}

              {galleryItems.length > 0 && (
                <Card elevation={3} style={[styles.sectionCard, { shadowColor: colors.black }]}>
                  <View style={styles.sectionCardContent}>
                    <Text variant="body" weight="medium" style={{ marginBottom: 16, color: colors.textPrimary }}>
                      {t('service.academy.template.media.galleryTitle')}
                    </Text>
                    <GalleryGrid items={galleryItems} onOpen={openLightbox} filter={mediaFilter} />
                  </View>
                </Card>
              )}
            </View>
          ) : null}

          {/* Success Story Section */}
          {templateSections.success_story && successStory ? (
            <View
              onLayout={(e) => (sectionsY.current.story = e.nativeEvent.layout.y)}
              style={{ marginBottom: 32 }}
            >
              <SuccessStoryCard story={successStory} i18n={i18n} t={t} onOpen={openLightbox} />
            </View>
          ) : null}

          {/* Location Section */}
          {templateSections.location ? (
            <View
              onLayout={(e) => (sectionsY.current.location = e.nativeEvent.layout.y)}
              style={{ marginBottom: 32 }}
            >
              <SectionHeader
                icon={<MapPin size={18} color={colors.accentOrange} />}
                title={t('service.academy.template.sections.location.title')}
                subtitle={t('service.academy.template.sections.location.subtitle')}
                right={
                  mapUrl ? (
                    <Button
                      variant="secondary"
                      size="small"
                      onPress={onOpenMaps}
                      leftIcon={<Navigation2 size={16} color={colors.white} />}
                    >
                      {t('service.academy.template.location.navigate')}
                    </Button>
                  ) : null
                }
              />

              <Card elevation={3} style={[styles.sectionCard, { shadowColor: colors.black }]}>
                <View style={styles.sectionCardContent}>
                  <View style={styles.locationRow}>
                    <LinearGradient
                      colors={[
                        alphaHex(colors.accentOrange, isDark ? '33' : '26'),
                        alphaHex(colors.accentOrange, isDark ? '1A' : '0D'),
                      ]}
                      style={styles.locationBadge}
                    >
                      <MapPin size={22} color={colors.accentOrange} />
                    </LinearGradient>
                    <View style={{ flex: 1 }}>
                      <Text weight="bold" style={{ marginBottom: 4, fontSize: 16, color: colors.textPrimary }}>
                        {safeText(academy?.address) || t('service.academy.template.location.addressEmpty')}
                      </Text>
                      <Text variant="bodySmall" color={colors.textSecondary}>
                        {safeText(academy?.city)}{safeText(academy?.country) ? `, ${safeText(academy?.country)}` : ''}
                      </Text>
                    </View>
                  </View>

                  {academy?.lat != null && academy?.lng != null ? (
                    <View style={[styles.inlineRow, { marginTop: 16 }]}>
                      <Compass size={16} color={colors.textSecondary} />
                      <Text variant="caption" color={colors.textSecondary} style={{ marginLeft: 8 }}>
                        {Number(academy.lat).toFixed(6)}, {Number(academy.lng).toFixed(6)}
                      </Text>
                    </View>
                  ) : null}

                  {academy?.has_facilities_booking ? (
                    <View style={[styles.inlineRow, { marginTop: 16 }]}>
                      <CheckCircle2 size={18} color={colors.success} />
                      <Text variant="bodySmall" style={{ marginLeft: 8, color: colors.success }}>
                        {t('service.academy.template.location.facilitiesBooking')}
                      </Text>
                    </View>
                  ) : null}

                  {mapUrl && (
                    <Button
                      variant="outline"
                      onPress={onOpenMaps}
                      leftIcon={<Navigation2 size={16} color={colors.accentOrange} />}
                      style={{ marginTop: 20 }}
                    >
                      {t('service.academy.template.location.getDirections')}
                    </Button>
                  )}
                </View>
              </Card>
            </View>
          ) : null}

          {/* Contact Section */}
          {(templateSections.contact_or_join || contactPhones.length > 0 || academy?.contact_email) ? (
            <View
              onLayout={(e) => (sectionsY.current.contact = e.nativeEvent.layout.y)}
              style={{ marginBottom: 32 }}
            >
              <SectionHeader
                icon={<Mail size={18} color={colors.accentOrange} />}
                title={t('service.academy.template.sections.contact.title')}
                subtitle={t('service.academy.template.sections.contact.subtitle')}
              />

              <Card elevation={3} style={[styles.sectionCard, { shadowColor: colors.black }]}>
                <View style={styles.sectionCardContent}>
                  <Button
                    onPress={onPrimary}
                    leftIcon={academy?.registration_open ? 'person-add' : 'mail'}
                    style={{ marginBottom: 20 }}
                  >
                    {academy?.registration_open
                      ? t('service.academy.template.contact.registerNow')
                      : t('service.academy.template.contact.contactAcademy')}
                  </Button>

                  <View style={{ gap: 16 }}>
                    {contactPhones.length > 0 ? (
                      <Pressable
                        onPress={onCall}
                        style={({ pressed }) => [
                          styles.contactRow,
                          { opacity: pressed ? 0.88 : 1, backgroundColor: alphaHex(colors.textPrimary, isDark ? '0D' : '05') },
                        ]}
                      >
                        <View
                          style={[
                            styles.contactIcon,
                            { backgroundColor: alphaHex(colors.success, isDark ? '24' : '1F') },
                          ]}
                        >
                          <Phone size={20} color={colors.success} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text weight="medium" style={{ color: colors.textPrimary }}>{t('service.academy.template.contact.call')}</Text>
                          <Text variant="bodySmall" color={colors.textSecondary}>
                            {safeText(contactPhones[0])}
                            {contactPhones.length > 1 &&
                              ` ${t('service.academy.template.contact.morePhones', {
                                count: contactPhones.length - 1,
                              })}`}
                          </Text>
                        </View>
                        <Navigation2 size={18} color={colors.textSecondary} />
                      </Pressable>
                    ) : null}

                    {academy?.contact_email ? (
                      <Pressable
                        onPress={onEmail}
                        style={({ pressed }) => [
                          styles.contactRow,
                          { opacity: pressed ? 0.88 : 1, backgroundColor: alphaHex(colors.textPrimary, isDark ? '0D' : '05') },
                        ]}
                      >
                        <View
                          style={[
                            styles.contactIcon,
                            { backgroundColor: alphaHex(colors.accentOrange, isDark ? '24' : '1F') },
                          ]}
                        >
                          <Mail size={20} color={colors.accentOrange} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text weight="medium" style={{ color: colors.textPrimary }}>{t('service.academy.template.contact.email')}</Text>
                          <Text variant="bodySmall" color={colors.textSecondary}>
                            {safeText(academy.contact_email)}
                          </Text>
                        </View>
                        <Navigation2 size={18} color={colors.textSecondary} />
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              </Card>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Floating CTA */}
      <Animated.View
        style={[
          styles.fabWrap,
          {
            opacity: scrollY.interpolate({
              inputRange: [0, 80],
              outputRange: [0, 1],
              extrapolate: 'clamp',
            }),
            transform: [
              {
                translateY: scrollY.interpolate({
                  inputRange: [0, 80],
                  outputRange: [14, 0],
                  extrapolate: 'clamp',
                }),
              },
            ],
          },
        ]}
      >
        <View style={[styles.fabShadow, { shadowColor: colors.black }]}>
          <LinearGradient
            colors={[colors.accentOrange, alphaHex(colors.accentOrange, 'B3')]}
            start={{ x: 0.0, y: 0.2 }}
            end={{ x: 1.0, y: 0.8 }}
            style={styles.fabGradient}
          />
          <Button
            onPress={onPrimary}
            size="large"
            leftIcon={academy?.registration_open ? 'person-add' : 'chatbubble'}
            style={[styles.fabBtn, { backgroundColor: alphaHex(colors.accentOrange, '00') }]}
          >
            {academy?.registration_open
              ? t('service.academy.template.cta.joinNow')
              : t('service.academy.template.cta.contact')}
          </Button>
        </View>
      </Animated.View>

      {/* Media Lightbox Modal */}
      <Modal
        visible={lightboxVisible}
        transparent
        animationType="fade"
        onRequestClose={closeLightbox}
      >
        <View style={[styles.lightboxContainer, { backgroundColor: alphaHex(colors.black, 'E6') }]}>
          <BlurView intensity={80} style={StyleSheet.absoluteFill} />
          <Pressable style={StyleSheet.absoluteFill} onPress={closeLightbox} />

          <View style={[styles.lightboxContent, { backgroundColor: alphaHex(colors.surface, 'F2') }]}>
            <View style={styles.lightboxHeader}>
              <Text variant="h4" weight="bold" style={{ color: colors.white }} numberOfLines={2}>
                {lightboxItem?.caption_en || lightboxItem?.caption_ar || t('service.academy.template.media.preview')}
              </Text>
              <Pressable onPress={closeLightbox} style={[styles.lightboxClose, { backgroundColor: alphaHex(colors.white, '1A') }]}>
                <X size={24} color={colors.white} />
              </Pressable>
            </View>

            {lightboxSrc ? (
              <Image
                source={{ uri: lightboxSrc }}
                style={styles.lightboxImage}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.lightboxFallback}>
                <ImageIcon size={48} color={colors.white} />
                <Text variant="body" style={{ color: colors.white, marginTop: 16 }}>
                  {t('service.academy.template.media.noPreview')}
                </Text>
              </View>
            )}

            <View style={styles.lightboxActions}>
              <Button variant="secondary" onPress={closeLightbox} style={{ flex: 1 }}>
                {t('service.academy.common.close')}
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // Header
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  topBarInner: {
    height: HEADER_H,
    paddingHorizontal: PADDING_X,
    paddingTop: Platform.OS === 'ios' ? 10 : 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  topIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Hero
  heroWrap: {
    height: HERO_H,
    overflow: 'hidden',
  },
  heroMedia: {
    ...StyleSheet.absoluteFillObject,
  },
  heroImg: {
    width: '100%',
    height: '100%',
  },
  heroContent: {
    ...StyleSheet.absoluteFillObject,
    paddingTop: HEADER_H + 12,
    paddingBottom: 18,
    paddingHorizontal: PADDING_X,
    justifyContent: 'space-between',
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    marginLeft: 6,
  },
  heroActionBtn: {
    width: 46,
    height: 46,
    borderRadius: 18,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  heroTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 8,
  },
  logoBox: {
    width: 74,
    height: 74,
    borderRadius: 24,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  logoImg: {
    width: '82%',
    height: '82%',
  },
  heroTitle: {
    fontSize: 28,
    letterSpacing: -0.6,
    lineHeight: 34,
  },
  heroSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  heroSub: {
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },

  // Features
  featureRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 14,
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 18,
    flex: 1,
    minWidth: '46%',
  },
  featurePillIcon: {
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  // Navigation
  navChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    borderWidth: 1,
    marginRight: 12,
    marginTop: 14,
  },

  // Sections
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
  },
  sectionCard: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 14,
    elevation: 6,
  },
  sectionCardContent: {
    padding: 22,
  },

  // About
  aboutMeta: {
    marginTop: 20,
    gap: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  websiteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  languagesSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
  },

  // Sports & Stats
  sportsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-around',
  },
  sportItem: {
    alignItems: 'center',
    width: '30%',
    minWidth: 100,
    paddingVertical: 6,
  },
  sportIcon: {
    width: 62,
    height: 62,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    minWidth: '22%',
    padding: 12,
    borderRadius: 16,
  },

  // Courses
  courseCard: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  courseCardInner: {
    overflow: 'hidden',
    borderRadius: 24,
  },
  courseImageContainer: {
    height: 180,
    position: 'relative',
  },
  courseImage: {
    width: '100%',
    height: '100%',
  },
  courseImageOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  featuredBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  courseContent: {
    padding: 16,
  },
  courseHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  courseMeta: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  courseSection: {
    marginBottom: 16,
  },
  coachChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },

  // Media
  carouselContainer: {
    marginBottom: 16,
  },
  carouselImageContainer: {
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  carouselImage: {
    width: '100%',
    height: '100%',
  },
  carouselFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  carouselOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  carouselControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  carouselButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  carouselDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  carouselDot: {
    height: 8,
    borderRadius: 4,
  },
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  galleryItem: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  galleryImage: {
    width: '100%',
    height: '100%',
  },
  galleryFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  galleryCaption: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
  },
  emptyGallery: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },

  // Success Story
  successStoryCard: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  successStoryContent: {
    padding: 20,
  },
  successStoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  storyImage: {
    width: '100%',
    height: 120,
    borderRadius: 12,
  },
  storyImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
  },

  // Location
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  locationBadge: {
    width: 52,
    height: 52,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Contact
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 18,
  },
  contactIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  heroVignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.10)',
  },

  // Floating CTA
  fabWrap: {
    position: 'absolute',
    left: PADDING_X,
    right: PADDING_X,
    bottom: 22,
    zIndex: 2000,
  },
  fabShadow: {
    borderRadius: 26,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 10,
  },
  fabGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  fabBtn: {
  },

  // Lightbox
  lightboxContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxContent: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 24,
    overflow: 'hidden',
    padding: 20,
  },
  lightboxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  lightboxClose: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxImage: {
    width: '100%',
    height: 300,
    borderRadius: 12,
  },
  lightboxFallback: {
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxActions: {
    marginTop: 20,
  },
});
