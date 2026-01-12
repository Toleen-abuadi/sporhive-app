// Portal Uniform Store Screen: catalog, cart, and checkout.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Screen } from '../../components/ui/Screen';
import { Text } from '../../components/ui/Text';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { PortalHeader } from '../../components/portal/PortalHeader';
import { PortalCard } from '../../components/portal/PortalCard';
import { PortalEmptyState } from '../../components/portal/PortalEmptyState';
import { portalApi } from '../../services/portal/portal.api';
import { useToast } from '../../components/ui/ToastHost';
import { useTranslation } from '../../services/i18n/i18n';
import { spacing } from '../../theme/tokens';

export function PortalUniformStoreScreen() {
  const { colors } = useTheme();
  const toast = useToast();
  const { t, isRTL } = useTranslation();
  const [catalog, setCatalog] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setError('');
    const res = await portalApi.fetchUniformStore();
    if (res?.success) {
      setCatalog(res.data?.data || res.data || []);
    } else {
      setError(res?.error?.message || t('portal.uniforms.error'));
    }
    setLoading(false);
  }, [t]);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + (item.quantity || 0), 0), [cart]);

  const updateCart = (item, updates) => {
    setCart((prev) => {
      const existing = prev.find((entry) => entry.id === item.id);
      if (existing) {
        return prev.map((entry) => (entry.id === item.id ? { ...entry, ...updates } : entry));
      }
      return [...prev, { id: item.id, name: item.name, quantity: 1, size: '', number: '', nickname: '', ...updates }];
    });
  };

  const checkout = async () => {
    if (!cart.length) {
      toast.warning(t('portal.uniforms.validation'));
      return;
    }
    const payload = {
      items: cart.map((item) => ({
        uniform_id: item.id,
        quantity: item.quantity,
        size: item.size,
        player_number: item.number,
        nickname: item.nickname,
      })),
    };
    const res = await portalApi.placeUniformOrder(payload);
    if (res?.success) {
      toast.success(t('portal.uniforms.success'));
      setCart([]);
    } else {
      toast.error(res?.error?.message || t('portal.uniforms.error'));
    }
  };

  return (
    <Screen scroll contentContainerStyle={[styles.scroll, isRTL && styles.rtl]}>
      <PortalHeader title={t('portal.uniforms.title')} subtitle={t('portal.uniforms.subtitle')} />

      {loading && !catalog.length ? (
        <PortalEmptyState
          icon="shopping-bag"
          title={t('portal.uniforms.loadingTitle')}
          description={t('portal.uniforms.loadingDescription')}
        />
      ) : null}

      {error ? (
        <PortalEmptyState
          icon="alert-triangle"
          title={t('portal.uniforms.errorTitle')}
          description={error}
          action={(
            <Button variant="secondary" onPress={loadCatalog}>
              {t('common.retry')}
            </Button>
          )}
        />
      ) : catalog.length === 0 && !loading ? (
        <PortalEmptyState
          icon="shopping-bag"
          title={t('portal.uniforms.emptyTitle')}
          description={t('portal.uniforms.emptyDescription')}
        />
      ) : (
        <View style={styles.list}>
          {catalog.map((item, index) => (
            <PortalCard key={item?.id ?? index} style={styles.card}>
              <View style={styles.cardRow}>
                <View style={styles.imageWrap}>
                  {item?.image || item?.image_url ? (
                    <Image source={{ uri: item.image || item.image_url }} style={styles.image} />
                  ) : (
                    <View style={[styles.imageFallback, { backgroundColor: colors.surfaceElevated || colors.surface }]}>
                      <Text variant="caption" color={colors.textMuted}>
                        {t('portal.uniforms.kit')}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.info}>
                  <Text variant="body" weight="semibold" color={colors.textPrimary}>
                    {item?.name || t('portal.uniforms.defaultName')}
                  </Text>
                  <Text variant="bodySmall" color={colors.textSecondary} style={styles.subtitle}>
                    {item?.description || t('portal.uniforms.defaultDescription')}
                  </Text>
                </View>
              </View>
              <View style={styles.formRow}>
                <Input
                  label={t('portal.uniforms.size')}
                  placeholder={t('portal.uniforms.sizePlaceholder')}
                  value={cart.find((c) => c.id === item.id)?.size || ''}
                  onChangeText={(value) => updateCart(item, { size: value })}
                />
                <Input
                  label={t('portal.uniforms.quantity')}
                  placeholder={t('portal.uniforms.quantityPlaceholder')}
                  keyboardType="numeric"
                  value={String(cart.find((c) => c.id === item.id)?.quantity || '')}
                  onChangeText={(value) => updateCart(item, { quantity: Number(value) || 1 })}
                />
                <Input
                  label={t('portal.uniforms.number')}
                  placeholder={t('portal.uniforms.numberPlaceholder')}
                  keyboardType="numeric"
                  value={cart.find((c) => c.id === item.id)?.number || ''}
                  onChangeText={(value) => updateCart(item, { number: value })}
                />
                <Input
                  label={t('portal.uniforms.nickname')}
                  placeholder={t('portal.uniforms.nicknamePlaceholder')}
                  value={cart.find((c) => c.id === item.id)?.nickname || ''}
                  onChangeText={(value) => updateCart(item, { nickname: value })}
                />
              </View>
              <TouchableOpacity
                style={[styles.addButton, { borderColor: colors.accentOrange }]}
                onPress={() => updateCart(item, { quantity: cart.find((c) => c.id === item.id)?.quantity || 1 })}
              >
                <Text variant="bodySmall" color={colors.accentOrange}>
                  {t('portal.uniforms.addToCart')}
                </Text>
              </TouchableOpacity>
            </PortalCard>
          ))}
        </View>
      )}

      <PortalCard style={styles.checkoutCard}>
        <View style={styles.checkoutRow}>
          <View>
            <Text variant="body" weight="semibold" color={colors.textPrimary}>
              {t('portal.uniforms.cartTitle')}
            </Text>
            <Text variant="bodySmall" color={colors.textSecondary}>
              {cartCount} {t('portal.uniforms.cartItems')}
            </Text>
          </View>
          <Button onPress={checkout} disabled={!cart.length}>
            {t('portal.uniforms.checkout')}
          </Button>
        </View>
      </PortalCard>
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
  cardRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  imageWrap: {
    width: 64,
    height: 64,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  imageFallback: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  subtitle: {
    marginTop: spacing.xs,
  },
  formRow: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  addButton: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  checkoutCard: {
    marginTop: spacing.md,
  },
  checkoutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rtl: {
    direction: 'rtl',
  },
});
