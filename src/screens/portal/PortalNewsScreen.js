// Portal News Screen: academy updates and announcements.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, FlatList, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import ImageViewing from 'react-native-image-viewing';
import dayjs from 'dayjs';

import { useTheme } from '../../theme/ThemeProvider';
import { Screen } from '../../components/ui/Screen';
import { Text } from '../../components/ui/Text';
import { SporHiveLoader } from '../../components/ui/SporHiveLoader';
import { PortalHeader } from '../../components/portal/PortalHeader';
import { PortalCard } from '../../components/portal/PortalCard';
import { PortalEmptyState } from '../../components/portal/PortalEmptyState';
import { portalApi } from '../../services/api/playerPortalApi';
import { getPortalAuthHeaders, resolvePortalAcademyId } from '../../services/api/portalHeaders';
import { useTranslation } from '../../services/i18n/i18n';
import { spacing } from '../../theme/tokens';
import { PortalActionBanner } from '../../components/portal/PortalActionBanner';
import { storage, PORTAL_KEYS } from '../../services/storage/storage';
import { useAuth } from '../../services/auth/auth.store';
import { PortalAccessGate } from '../../components/portal/PortalAccessGate';

function safeJsonParse(value) {
  try {
    return typeof value === 'string' ? JSON.parse(value) : value;
  } catch {
    return null;
  }
}

export function PortalNewsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t, isRTL } = useTranslation();
  const { ensurePortalReauthOnce } = useAuth();

  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [academyId, setAcademyId] = useState(null);
  const [tryOutId, setTryOutId] = useState(null);
  const [portalHeaders, setPortalHeaders] = useState(null);

  const [failedImages, setFailedImages] = useState({}); // key => true
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerImages, setViewerImages] = useState([]); // [{ uri }]
  const [viewerIndex, setViewerIndex] = useState(0);

  // 1) Load academy_id, tryout_id, and portal headers for image requests
  useEffect(() => {
    (async () => {
      try {
        const resolvedAcademyId = await resolvePortalAcademyId();
        setAcademyId(resolvedAcademyId ?? null);

        const sessRaw = await storage.getItem(PORTAL_KEYS.SESSION);
        const sess = safeJsonParse(sessRaw);

        const tId =
          sess?.tryOutId ??
          sess?.try_out_id ??
          sess?.overview?.player?.tryOutId ??
          sess?.overview?.player?.try_out_id ??
          null;

        setTryOutId(tId ?? null);
        try {
          const headers = await getPortalAuthHeaders({ academyId: resolvedAcademyId });
          setPortalHeaders(headers);
        } catch {
          setPortalHeaders(null);
        }
      } catch {
        setAcademyId(null);
        setTryOutId(null);
        setPortalHeaders(null);
      }
    })();
  }, []);

  // 2) Resolve proxy image URL
  const resolveNewsImageUrl = useCallback(
    (imageUrl, newsId, imageId) => {
      if (!imageUrl || typeof imageUrl !== 'string') return null;

      // already absolute
      if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) return imageUrl;

      // try infer IDs from "/news/{id}/images/{id}"
      if (!newsId || !imageId) {
        const match = imageUrl.match(/^\/?news\/(\d+)\/images\/(\d+)/);
        if (match) {
          newsId = match[1];
          imageId = match[2];
        }
      }

      const base = (portalApi?.baseUrl || '').replace(/\/$/, '');
      if (!base) return null;

      if (newsId && imageId) {
        const proxyPath = `/player-portal-external-proxy/news/${newsId}/images/${imageId}`;
        const qp = [];
        if (academyId) qp.push(`academy_id=${encodeURIComponent(String(academyId))}`);
        if (tryOutId) qp.push(`tryout_id=${encodeURIComponent(String(tryOutId))}`);
        return `${base}${proxyPath}${qp.length ? `?${qp.join('&')}` : ''}`;
      }

      const path = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
      return `${base}${path}`;
    },
    [academyId, tryOutId]
  );

  const imageHeaders = useMemo(() => {
    // IMPORTANT: this is what fixes most "images not showing" issues
    if (!portalHeaders) return undefined;
    return portalHeaders;
  }, [portalHeaders]);

  const handleImageError = useCallback((key, uri) => {
    console.warn('News image failed to load:', uri);
    setFailedImages(prev => ({ ...prev, [key]: true }));
  }, []);

  // 3) Fetch News
  const loadNews = useCallback(async () => {
    setLoading(true);
    setError(null);
    setFailedImages({});

    try {
      const res = await portalApi.fetchNews();

      if (!res?.success) {
        setError(res?.error || new Error(t('portal.news.error')));
        setLoading(false);
        return;
      }

      const raw = res.data;
      const list =
        Array.isArray(raw) ? raw :
        Array.isArray(raw?.news) ? raw.news :
        Array.isArray(raw?.data?.news) ? raw.data.news :
        Array.isArray(raw?.data) ? raw.data :
        [];

      const processed = list.map(item => {
        const imgs = Array.isArray(item?.images) ? item.images : [];

        const processedImages = imgs
          .slice()
          .sort((a, b) => (a?.sort_order ?? 999) - (b?.sort_order ?? 999))
          .map(img => {
            const newsId = item?.id ?? img?.news_id;
            const imageId = img?.id ?? img?.image_id;
            const resolvedUrl = resolveNewsImageUrl(img?.image_url, newsId, imageId);
            return {
              ...img,
              newsId,
              imageId,
              resolvedUrl,
              key: `${newsId}-${imageId}`,
            };
          })
          .filter(x => !!x.resolvedUrl);

        return { ...item, processedImages };
      });

      setNews(processed);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [resolveNewsImageUrl, t]);

  useEffect(() => {
    loadNews();
  }, [loadNews]);


  const importantNews = useMemo(() => news.filter((item) => item?.is_important || item?.pinned || Number(item?.priority || 0) > 0), [news]);
  const regularNews = useMemo(() => news.filter((item) => !(item?.is_important || item?.pinned || Number(item?.priority || 0) > 0)), [news]);

  const openViewer = useCallback((images, index) => {
    setViewerImages(images.map(i => ({ uri: i.resolvedUrl })));
    setViewerIndex(index);
    setViewerOpen(true);
  }, []);

  const renderImagesRow = useCallback(({ item }) => {
    const images = item?.processedImages || [];
    if (!images.length) return null;

    const visible = images.filter(img => !failedImages[img.key]);

    if (!visible.length) {
      return (
        <View style={[styles.imagePlaceholder, { backgroundColor: colors.cardMuted || '#f2f2f2' }]}>
          <Text variant="caption" color={colors.textMuted}>
            {t('portal.news.imagesUnavailable')}
          </Text>
        </View>
      );
    }

    return (
      <FlatList
        data={visible}
        keyExtractor={(img) => img.key}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.imagesRow}
        renderItem={({ item: img, index }) => (
          <Pressable onPress={() => openViewer(visible, index)} style={styles.imagePress}>
            <Image
              source={{ uri: img.resolvedUrl, headers: imageHeaders }}
              style={styles.newsImage}
              contentFit="cover"
              transition={180}
              cachePolicy="disk"
              onError={() => handleImageError(img.key, img.resolvedUrl)}
            />
          </Pressable>
        )}
      />
    );
  }, [colors.cardMuted, colors.textMuted, failedImages, handleImageError, imageHeaders, openViewer, t]);

  if (loading && news.length === 0 && !error) {
    return (
      <Screen>
        <SporHiveLoader />
      </Screen>
    );
  }

  return (
    <PortalAccessGate
      titleOverride={t('portal.news.title')}
      error={error}
      onRetry={loadNews}
      onReauthRequired={async () => {
        const res = await ensurePortalReauthOnce?.();
        if (res?.success) {
          loadNews();
        } else {
          router.replace('/(auth)/login?mode=player');
        }
      }}
    >
    <Screen scroll contentContainerStyle={[styles.scroll, isRTL && styles.rtl]}>
      <PortalHeader
        title={t('portal.news.title')}
        subtitle={t('portal.news.subtitle')}
      />
      <PortalActionBanner title="Start here" description="Important updates appear first. Open each card for details and media." />

      {!!error ? (
        <PortalEmptyState
          icon="alert-triangle"
          title={t('portal.news.errorTitle')}
          description={error?.message || t('portal.news.error')}
          action={<TouchableOpacity onPress={loadNews} style={[styles.retryButton, { backgroundColor: colors.card }]}><Text variant="bodySmall" color={colors.textPrimary}>{t('portal.common.retry')}</Text></TouchableOpacity>}
        />
      ) : news?.length ? (
        <View style={styles.list}>
          {importantNews.length ? <Text variant="bodySmall" weight="bold" color={colors.textPrimary}>Important</Text> : null}
          {importantNews.map((item) => {
            const createdAt = item?.created_at ? dayjs(item.created_at).format('MMM D, YYYY • h:mm A') : null;
            const source = item?.source || item?.academy_name || 'SporHive';
            return (
              <TouchableOpacity key={`imp-${String(item?.id)}`} activeOpacity={0.9}>
                <PortalCard style={styles.card}>
                  <Text variant="body" weight="semibold" color={colors.textPrimary}>{item?.title || t('portal.news.defaultTitle')}</Text>
                  <Text variant="caption" weight="bold" color={colors.error}>Important</Text>
                  <Text variant="caption" color={colors.textMuted} style={styles.meta}>{`${createdAt || t('portal.common.placeholder')} • ${source}`}</Text>
                  {renderImagesRow({ item })}
                  <Text numberOfLines={3} variant="bodySmall" color={colors.textSecondary} style={styles.subtitle}>{item?.description || t('portal.news.defaultDescription')}</Text>
                </PortalCard>
              </TouchableOpacity>
            );
          })}

          {regularNews.length ? <Text variant="bodySmall" weight="bold" color={colors.textPrimary}>All updates</Text> : null}
          {regularNews.map((item) => {
            const createdAt = item?.created_at ? dayjs(item.created_at).format('MMM D, YYYY • h:mm A') : null;
            const source = item?.source || item?.academy_name || 'SporHive';
            return (
              <TouchableOpacity key={`all-${String(item?.id)}`} activeOpacity={0.9}>
                <PortalCard style={styles.card}>
                  <Text variant="body" weight="semibold" color={colors.textPrimary}>{item?.title || t('portal.news.defaultTitle')}</Text>
                  <Text variant="caption" color={colors.textMuted} style={styles.meta}>{`${createdAt || t('portal.common.placeholder')} • ${source}`}</Text>
                  {renderImagesRow({ item })}
                  <Text numberOfLines={3} variant="bodySmall" color={colors.textSecondary} style={styles.subtitle}>{item?.description || t('portal.news.defaultDescription')}</Text>
                </PortalCard>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        <PortalEmptyState
          icon="volume-2"
          title={t('portal.news.emptyTitle')}
          description={t('portal.news.emptyDescription') || 'No updates yet.'}
        />
      )}

      <ImageViewing
        images={viewerImages}
        imageIndex={viewerIndex}
        visible={viewerOpen}
        onRequestClose={() => setViewerOpen(false)}
      />
    </Screen>
    </PortalAccessGate>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg },
  list: { gap: spacing.md },
  card: { marginBottom: spacing.md },

  meta: { marginTop: spacing.xs },
  subtitle: { marginTop: spacing.sm },

  imagesRow: {
    marginTop: spacing.sm,
    paddingBottom: 2,
    gap: spacing.sm,
  },
  imagePress: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  newsImage: {
    width: 240,
    height: 140,
    borderRadius: 14,
  },

  imagePlaceholder: {
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  retryButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 14,
    alignItems: 'center',
  },

  rtl: { direction: 'rtl' },
});
