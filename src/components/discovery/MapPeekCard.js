import React, { useMemo } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { MapPin, Star } from 'lucide-react-native';

import { Card } from '../ui/Card';
import { Text } from '../ui/Text';
import { Button } from '../ui/Button';
import { useTheme } from '../../theme/ThemeProvider';
import { useI18n } from '../../services/i18n/i18n';
import { makeADTheme } from '../../theme/academyDiscovery.styles';
import { API_BASE_URL } from '../../services/api/client';

const toAbsoluteUrlMaybe = (url, base) => {
  if (!url) return null;
  const s = String(url);
  if (s.startsWith('http://') || s.startsWith('https://') || s.startsWith('data:')) return s;
  if (!base) return s;
  return `${base.replace(/\/$/, '')}/${s.replace(/^\//, '')}`;
};

const academyImageUrl = (base, slug, kind) => {
  if (!base || !slug) return null;
  return `${base.replace(/\/$/, '')}/public/academies/image/${encodeURIComponent(slug)}/${kind}`;
};

export function MapPeekCard({ academy, onView }) {
  const { colors, isDark } = useTheme();
  const { t } = useI18n();
  const theme = useMemo(() => makeADTheme(colors, isDark), [colors, isDark]);

  const vm = useMemo(() => {
    if (!academy) return null;
    const slug = academy.slug;
    const name = academy.name_en || academy.name_ar || academy.name || t('service.academy.common.defaultName');
    const city = academy.city || academy.location || '';
    const rating = academy.rating || academy.rating_avg || academy.ratingAvg || null;
    const ratingCount = academy.rating_count || academy.ratingCount || null;

    const cover =
      toAbsoluteUrlMaybe(academy.cover_url, API_BASE_URL) ||
      academyImageUrl(API_BASE_URL, slug, 'cover');
    const logo =
      toAbsoluteUrlMaybe(academy.logo_url, API_BASE_URL) ||
      academyImageUrl(API_BASE_URL, slug, 'logo');

    return {
      slug,
      name,
      city,
      rating,
      ratingCount,
      cover,
      logo,
    };
  }, [academy, t]);

  if (!vm) return null;

  return (
    <Card style={[styles.card, { backgroundColor: theme.surface2, borderColor: theme.hairline }]}
    >
      <View style={styles.row}>
        <View style={styles.imageWrap}>
          {vm.cover ? (
            <Image source={{ uri: vm.cover }} style={styles.image} resizeMode="cover" />
          ) : vm.logo ? (
            <Image source={{ uri: vm.logo }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={[styles.image, { backgroundColor: theme.surface1 }]} />
          )}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text variant="h4" weight="bold" numberOfLines={1} style={{ color: theme.text.primary }}>
            {vm.name}
          </Text>
          <View style={styles.metaRow}>
            <MapPin size={14} color={theme.text.muted} />
            <Text variant="caption" color={theme.text.secondary} numberOfLines={1}>
              {' '}{vm.city || t('service.academy.common.emptyValue')}
            </Text>
          </View>
          {vm.rating ? (
            <View style={styles.metaRow}>
              <Star size={14} color={theme.accent.orange} />
              <Text variant="caption" color={theme.text.secondary}>
                {' '}{vm.rating}{vm.ratingCount ? ` (${vm.ratingCount})` : ''}
              </Text>
            </View>
          ) : null}
        </View>
        <View style={{ justifyContent: 'center' }}>
          <Button onPress={() => onView?.(academy)}>
            <Text variant="caption" weight="bold" style={{ color: theme.text.onDark }}>
              {t('service.academy.discovery.peek.view')}
            </Text>
          </Button>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  imageWrap: {
    width: 72,
    height: 72,
    borderRadius: 16,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
});
