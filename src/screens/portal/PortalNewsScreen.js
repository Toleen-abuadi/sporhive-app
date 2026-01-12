// Portal News Screen: academy updates and announcements.
import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Screen } from '../../components/ui/Screen';
import { Text } from '../../components/ui/Text';
import { PortalHeader } from '../../components/portal/PortalHeader';
import { PortalCard } from '../../components/portal/PortalCard';
import { PortalEmptyState } from '../../components/portal/PortalEmptyState';
import { portalApi } from '../../services/portal/portal.api';
import { useTranslation } from '../../services/i18n/i18n';
import { spacing } from '../../theme/tokens';

export function PortalNewsScreen() {
  const { colors } = useTheme();
  const { t, isRTL } = useTranslation();
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadNews = useCallback(async () => {
    setLoading(true);
    setError('');
    const res = await portalApi.fetchNews();
    if (res?.success) {
      setNews(res.data?.data || res.data || []);
    } else {
      setError(res?.error?.message || t('portal.news.error'));
    }
    setLoading(false);
  }, [t]);

  useEffect(() => {
    loadNews();
  }, [loadNews]);

  return (
    <Screen scroll contentContainerStyle={[styles.scroll, isRTL && styles.rtl]}>
      <PortalHeader title={t('portal.news.title')} subtitle={t('portal.news.subtitle')} />

      {error ? (
        <PortalEmptyState
          icon="alert-triangle"
          title={t('portal.news.errorTitle')}
          description={error}
          action={(
            <TouchableOpacity onPress={loadNews} style={styles.retryButton}>
              <Text variant="bodySmall" color={colors.textPrimary}>
                {t('common.retry')}
              </Text>
            </TouchableOpacity>
          )}
        />
      ) : news?.length ? (
        <View style={styles.list}>
          {news.map((item, index) => (
            <TouchableOpacity key={item?.id ?? index}>
              <PortalCard style={styles.card}>
                <Text variant="body" weight="semibold" color={colors.textPrimary}>
                  {item?.title || t('portal.news.defaultTitle')}
                </Text>
                <Text variant="caption" color={colors.textMuted} style={styles.meta}>
                  {item?.date || item?.created_at || '—'}
                </Text>
                <Text variant="bodySmall" color={colors.textSecondary} style={styles.subtitle}>
                  {item?.summary || item?.excerpt || t('portal.news.defaultDescription')}
                </Text>
              </PortalCard>
            </TouchableOpacity>
          ))}
        </View>
      ) : loading ? (
        <PortalEmptyState
          icon="volume-2"
          title={t('portal.news.loadingTitle')}
          description={t('portal.news.loadingDescription')}
        />
      ) : (
        <PortalEmptyState
          icon="volume-2"
          title={t('portal.news.emptyTitle')}
          description={t('portal.news.emptyDescription')}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing.lg,
  },
  list: {
    gap: spacing.md,
  },
  card: {
    marginBottom: spacing.md,
  },
  meta: {
    marginTop: spacing.xs,
  },
  subtitle: {
    marginTop: spacing.xs,
  },
  retryButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 14,
    alignItems: 'center',
  },
  rtl: {
    direction: 'rtl',
  },
});
