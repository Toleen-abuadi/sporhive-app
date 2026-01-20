// Portal News Screen: academy updates and announcements.
import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native'; // ✅ add Image + ScrollView
import { useTheme } from '../../theme/ThemeProvider';
import { Screen } from '../../components/ui/Screen';
import { Text } from '../../components/ui/Text';
import { SporHiveLoader } from '../../components/ui/SporHiveLoader';
import { PortalHeader } from '../../components/portal/PortalHeader';
import { PortalCard } from '../../components/portal/PortalCard';
import { PortalEmptyState } from '../../components/portal/PortalEmptyState';
import { portalApi } from '../../services/portal/portal.api';
import { useTranslation } from '../../services/i18n/i18n';
import { spacing } from '../../theme/tokens';
import { storage, PORTAL_KEYS } from '../../services/storage/storage';


export function PortalNewsScreen() {
  const { colors } = useTheme();
  const { t, isRTL } = useTranslation();
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const placeholder = t('service.portal.common.placeholder');

  const [academyId, setAcademyId] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        // Prefer dedicated helpers if your storage wrapper has them
        let id = null;

        if (storage.getPortalAcademyId) {
          id = await storage.getPortalAcademyId();
        }

        if (!id) {
          const rawId = await storage.getItem(PORTAL_KEYS.ACADEMY_ID);
          if (rawId) id = rawId;
        }

        if (!id) {
          const sess = await storage.getItem(PORTAL_KEYS.SESSION);
          const parsed = typeof sess === 'string' ? JSON.parse(sess) : sess;
          id = parsed?.academyId;
        }

        const n = Number(id);
        setAcademyId(Number.isFinite(n) ? n : null);
      } catch (e) {
        setAcademyId(null);
      }
    })();
  }, []);


  // ✅ Build absolute image URL from the relative image_url returned by API
const resolveNewsImageUrl = useCallback((imageUrl) => {
  if (!imageUrl || typeof imageUrl !== 'string') return null;

  // If backend already sends absolute URL, keep it
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) return imageUrl;

  // Expect: "/news/10/images/15"
  const match = imageUrl.match(/^\/?news\/(\d+)\/images\/(\d+)/);
  if (!match) {
    // fallback: attempt to use direct (may fail if needs auth)
    const base = (portalApi?.baseUrl || '').replace(/\/$/, '');
    const path = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
    return `${base}${path}`;
  }

  const [, newsId, imageId] = match;

  // Proxy endpoint (GET):
  // /api/v1/player-portal-external-proxy/news/<newsId>/images/<imageId>?academy_id=1
  const base = (portalApi?.baseUrl || '').replace(/\/$/, '');
  const proxyPath = `/player-portal-external-proxy/news/${newsId}/images/${imageId}`;
  const academyQ = academyId ? `?academy_id=${academyId}` : '';

  return `${base}${proxyPath}${academyQ}`;
}, [academyId]);


  const loadNews = useCallback(async () => {
    setLoading(true);
    setError('');
    const res = await portalApi.fetchNews();

    if (res?.success) {
      const raw = res.data;

      const list =
        Array.isArray(raw) ? raw :
          Array.isArray(raw?.news) ? raw.news :
            Array.isArray(raw?.data?.news) ? raw.data.news :
              Array.isArray(raw?.data) ? raw.data :
                [];

      setNews(list);
    } else {
      setError(res?.error?.message || t('service.portal.news.error'));
    }

    setLoading(false);
  }, [t]);

  useEffect(() => {
    loadNews();
  }, [loadNews]);

  if (loading && news.length === 0 && !error) {
    return (
      <Screen>
        <SporHiveLoader />
      </Screen>
    );
  }

  return (
    <Screen scroll contentContainerStyle={[styles.scroll, isRTL && styles.rtl]}>
      <PortalHeader
        title={t('service.portal.news.title')}
        subtitle={t('service.portal.news.subtitle')}
      />

      {error ? (
        <PortalEmptyState
          icon="alert-triangle"
          title={t('service.portal.news.errorTitle')}
          description={error}
          action={(
            <TouchableOpacity onPress={loadNews} style={styles.retryButton}>
              <Text variant="bodySmall" color={colors.textPrimary}>
                {t('service.portal.common.retry')}
              </Text>
            </TouchableOpacity>
          )}
        />
      ) : news?.length ? (
        <View style={styles.list}>
          {news.map((item, index) => {
            const images = Array.isArray(item?.images) ? item.images : [];
            const imageUris = images
              .map((img) => resolveNewsImageUrl(img?.image_url))
              .filter(Boolean);

            return (
              <TouchableOpacity key={item?.id ?? index}>
                <PortalCard style={styles.card}>
                  <Text variant="body" weight="semibold" color={colors.textPrimary}>
                    {item?.title || t('service.portal.news.defaultTitle')}
                  </Text>

                  <Text variant="caption" color={colors.textMuted} style={styles.meta}>
                    {item?.created_at || placeholder}
                  </Text>

                  {!!imageUris.length && (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.imagesRow}
                    >
                      {imageUris.map((uri, i) => (
                        <Image
                          key={`${item?.id || index}-img-${i}`}
                          source={{ uri }}
                          style={styles.newsImage}
                          resizeMode="cover"
                          onError={(e) => console.log('NEWS IMG ERROR:', uri, e.nativeEvent?.error)}
                        />
                      ))}
                    </ScrollView>
                  )}

                  <Text variant="bodySmall" color={colors.textSecondary} style={styles.subtitle}>
                    {item?.description || t('service.portal.news.defaultDescription')}
                  </Text>
                </PortalCard>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        <PortalEmptyState
          icon="volume-2"
          title={t('service.portal.news.emptyTitle')}
          description={t('service.portal.news.emptyDescription')}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg },
  list: { gap: spacing.md },
  card: { marginBottom: spacing.md },
  meta: { marginTop: spacing.xs },
  subtitle: { marginTop: spacing.xs },

  // ✅ image row
  imagesRow: {
    marginTop: spacing.sm,
    paddingBottom: 2,
  },
  newsImage: {
    width: 220,
    height: 130,
    borderRadius: 14,
    marginRight: spacing.sm,
  },

  retryButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 14,
    alignItems: 'center',
  },
  rtl: { direction: 'rtl' },
});
