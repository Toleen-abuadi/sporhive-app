// Portal Uniform Store Screen (Redesigned): famous-app style catalog + cart bar + size chips + quantity stepper.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Image,
  TouchableOpacity,
  FlatList,
  Modal,
  Pressable,
} from 'react-native';

import { useTheme } from '../../theme/ThemeProvider';
import { Screen } from '../../components/ui/Screen';
import { Text } from '../../components/ui/Text';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ThemedLoader } from '../../components/ui/ThemedLoader';
import { PortalHeader } from '../../components/portal/PortalHeader';
import { PortalEmptyState } from '../../components/portal/PortalEmptyState';
import { portalApi } from '../../services/api/playerPortalApi';
import { useToast } from '../../components/ui/ToastHost';
import { useTranslation } from '../../services/i18n/i18n';
import { PortalAccessGate } from '../../components/portal/PortalAccessGate';
import { spacing } from '../../theme/tokens';
import { PortalActionBanner } from '../../components/portal/PortalActionBanner';
import { usePortalReady } from '../../hooks/usePortalReady';
import { usePlayerPortalActions, usePlayerPortalStore } from '../../stores/playerPortal.store';

const alphaHex = (hex, alpha = '1A') => {
  if (!hex) return hex;
  const normalized = hex.replace('#', '');
  if (normalized.length === 3) {
    const [r, g, b] = normalized.split('');
    return `#${r}${r}${g}${g}${b}${b}${alpha}`;
  }
  if (normalized.length === 6) return `#${normalized}${alpha}`;
  if (normalized.length === 8) return `#${normalized.slice(0, 6)}${alpha}`;
  return hex;
};

const clampInt = (n, min, max) => {
  const x = Number(n);
  if (!Number.isFinite(x)) return min;
  return Math.max(min, Math.min(max, Math.floor(x)));
};

const safeArray = (v) => (Array.isArray(v) ? v : []);

const STOCK_NUMBER_KEYS = [
  'stock',
  'stocks',
  'available_stock',
  'availableStock',
  'available_quantity',
  'availableQuantity',
  'available_qty',
  'availableQty',
  'quantity',
  'qty',
  'inventory',
  'inventory_count',
  'inventoryCount',
];

const STOCK_BOOLEAN_KEYS = ['in_stock', 'inStock', 'is_in_stock', 'isInStock', 'available', 'is_available', 'isAvailable'];

const resolveStockValue = (product, variant) => {
  const sources = [variant, product];
  for (const source of sources) {
    if (!source || typeof source !== 'object') continue;

    for (const key of STOCK_NUMBER_KEYS) {
      const raw = source?.[key];
      if (raw == null || raw === '') continue;
      const n = Number(raw);
      if (Number.isFinite(n)) return n;
    }

    for (const key of STOCK_BOOLEAN_KEYS) {
      const raw = source?.[key];
      if (typeof raw === 'boolean') return raw ? 1 : 0;
    }
  }

  return null;
};

const isOutOfStock = (product, variant) => {
  const stock = resolveStockValue(product, variant);
  return stock != null && stock <= 0;
};

const formatMoney = (value, currency = '') => {
  // Keep it simple (no Intl to avoid locale pitfalls in RN)
  const n = Number(value);
  if (!Number.isFinite(n)) return `${currency}${0}`;
  const fixed = Number.isInteger(n) ? String(n) : n.toFixed(2);
  return currency ? `${currency}${fixed}` : fixed;
};

export function PortalUniformStoreScreen() {
  const { colors } = useTheme();
  const toast = useToast();
  const { t, isRTL } = useTranslation();
  const placeholder = t('portal.common.placeholder');
  const { ready: portalReady, ensure: ensurePortalReady } = usePortalReady();
  const portalActions = usePlayerPortalActions();
  const { storeLoadedOnce } = usePlayerPortalStore((state) => ({
    storeLoadedOnce: state.storeLoadedOnce,
  }));
  const didFetchRef = useRef(false);
  const reauthHandledRef = useRef(false);

  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Cart holds normalized lines (product + selected size/variant + qty + print fields)
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);

  // Quick "selected product" for sheet-like details (famous app feel)
  const [activeProduct, setActiveProduct] = useState(null);
  const [cartValidationError, setCartValidationError] = useState('');

  const catalogSections = useMemo(() => {
    const items = safeArray(catalog);
    const required = items.filter((x) => x?.is_required || x?.required || String(x?.type || '').toLowerCase().includes('required'));
    const recommended = items.filter((x) => !required.includes(x) && (x?.is_recommended || String(x?.type || '').toLowerCase().includes('recommended')));
    const optional = items.filter((x) => !required.includes(x) && !recommended.includes(x));
    return [
      { key: 'required', title: t('portal.uniforms.sections.required'), data: required },
      { key: 'recommended', title: t('portal.uniforms.sections.recommended'), data: recommended },
      { key: 'optional', title: t('portal.uniforms.sections.optional'), data: optional },
    ].filter((x) => x.data.length);
  }, [catalog, t]);

  const loadCatalog = useCallback(async () => {
    const sessionReady = await ensurePortalReady({ source: 'uniform_store_load' });
    if (!sessionReady?.ready) {
      const sessionError = new Error('PORTAL_SESSION_INVALID');
      sessionError.kind = 'PORTAL_SESSION_INVALID';
      sessionError.reason = sessionReady?.reason || 'portal_not_ready';
      setError(sessionError);
      return { success: false, reason: sessionReady?.reason || 'portal_not_ready' };
    }

    setLoading(true);
    setError(null);
    try {
      const res = await portalApi.fetchUniformStore();

      if (res?.success) {
        const raw = res.data;

        const list =
          Array.isArray(raw?.data?.products) ? raw.data.products :
            Array.isArray(raw?.products) ? raw.products :
              Array.isArray(raw) ? raw :
                Array.isArray(raw?.data) ? raw.data :
                  [];

        setCatalog(safeArray(list));
        portalActions.markStoreLoadedOnce?.(true);
      } else {
        setError(res?.error || new Error(t('portal.uniforms.error')));
      }
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [ensurePortalReady, portalActions, t]);

  const handleReauthRequired = useCallback(async () => {
    if (reauthHandledRef.current) return { recovered: false };
    reauthHandledRef.current = true;
    const res = await ensurePortalReady({ source: 'uniform_store_gate_reauth', force: true });
    if (res?.ready) {
      reauthHandledRef.current = false;
      await loadCatalog();
      return { recovered: true };
    }
    return { recovered: false, reason: res?.reason || 'PORTAL_REAUTH_FAILED' };
  }, [ensurePortalReady, loadCatalog]);

  useEffect(() => {
    if (!portalReady) return;
    if (didFetchRef.current) return;
    didFetchRef.current = true;
    loadCatalog();
  }, [loadCatalog, portalReady]);

  const getDisplayName = useCallback(
    (item) => {
      if (isRTL && item?.name_ar) return item.name_ar;
      return item?.name_en || item?.name || t('portal.uniforms.defaultName');
    },
    [isRTL, t]
  );

  const getDisplayImage = useCallback((item) => {
    if (item?.photo_base64) {
      return { uri: `data:${item.photo_mime || 'image/jpeg'};base64,${item.photo_base64}` };
    }
    if (item?.image || item?.image_url) return { uri: item.image || item.image_url };
    return null;
  }, []);

  const getVariants = useCallback((item) => {
    // Expect: item.variants: [{id, size, price, ...}]
    const v = safeArray(item?.variants);
    // Sort by "sort_order" if exists, else by size label
    return v.slice().sort((a, b) => {
      const ao = a?.sort_order ?? 9999;
      const bo = b?.sort_order ?? 9999;
      if (ao !== bo) return ao - bo;
      return String(a?.size || '').localeCompare(String(b?.size || ''));
    });
  }, []);

  const getPriceRange = useCallback((item) => {
    const variants = getVariants(item);
    const prices = variants.map((v) => Number(v?.price)).filter((n) => Number.isFinite(n));
    const direct = Number(item?.price);
    if (!prices.length && Number.isFinite(direct)) return { min: direct, max: direct };

    if (!prices.length) return { min: null, max: null };
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return { min, max };
  }, [getVariants]);

  const cartCount = useMemo(
    () => cart.reduce((sum, line) => sum + (line?.quantity || 0), 0),
    [cart]
  );

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, line) => {
      const qty = Number(line?.quantity) || 0;
      const unit = Number(line?.unitPrice);
      return sum + (Number.isFinite(unit) ? unit * qty : 0);
    }, 0);
  }, [cart]);

  const findCartLine = useCallback(
    (productId, variantId) => cart.find((c) => c.productId === productId && c.variantId === variantId),
    [cart]
  );

  const upsertCartLine = useCallback((line) => {
    setCart((prev) => {
      const idx = prev.findIndex((x) => x.productId === line.productId && x.variantId === line.variantId);
      if (idx >= 0) {
        const next = prev.slice();
        next[idx] = { ...next[idx], ...line };
        return next;
      }
      return [...prev, line];
    });
  }, []);

  const removeCartLine = useCallback((productId, variantId) => {
    setCart((prev) => prev.filter((x) => !(x.productId === productId && x.variantId === variantId)));
  }, []);

  const setLineQty = useCallback((productId, variantId, qty) => {
    setCart((prev) =>
      prev.map((x) => {
        if (x.productId !== productId || x.variantId !== variantId) return x;
        const nextQty = clampInt(qty, 1, 99);
        return { ...x, quantity: nextQty };
      })
    );
  }, []);

  const addToCartFromProduct = useCallback((product, selectedVariant) => {
    if (!product) return;
    const variants = getVariants(product);

    // Must select size if variants exist
    if (variants.length && !selectedVariant) {
      toast.warning(t('portal.uniforms.sizeRequired'));
      return;
    }

    const v = selectedVariant || null;
    if (isOutOfStock(product, v)) {
      const outOfStockMessage = t('portal.uniforms.outOfStock');
      setCartValidationError(outOfStockMessage);
      toast.warning(outOfStockMessage);
      return;
    }

    const variantId = v?.id || `no-variant-${product.id}`;
    const sizeLabel = v?.size || '';
    const unitPrice = Number.isFinite(Number(v?.price)) ? Number(v.price) : Number(product?.price);

    if (!Number.isFinite(unitPrice)) {
      toast.warning(t('portal.uniforms.priceMissing'));
      return;
    }

    const existing = findCartLine(product.id, variantId);
    const nextQty = clampInt((existing?.quantity || 0) + 1, 1, 99);

    upsertCartLine({
      productId: product.id,
      variantId,
      name: getDisplayName(product),
      needPrinting: !!product?.need_printing,
      size: sizeLabel,
      unitPrice,
      quantity: nextQty,
      number: existing?.number || '',
      nickname: existing?.nickname || '',
    });

    setCartValidationError('');
    toast.success(t('portal.uniforms.added'));
  }, [findCartLine, getDisplayName, getVariants, t, toast, upsertCartLine]);

  const checkout = useCallback(async () => {
    if (!cart.length) {
      setCartValidationError(t('portal.uniforms.validation'));
      toast.warning(t('portal.uniforms.validation'));
      return;
    }

    const invalidPrinting = cart.find((x) => x.needPrinting && !String(x.number || '').trim());
    if (invalidPrinting) {
      setCartValidationError(t('portal.uniforms.playerNumberRequired'));
      return;
    }
    setCartValidationError('');

    // Transform to match web version payload exactly
    const uniform_details = cart.map((line) => ({
      variant_id: line.variantId,
      uniform_quantity: line.quantity,
    }));

    // Find first printing item for order-level printing info
    const printingLine = cart.find((x) => x.needPrinting);
    const basePayload = {
      uniform_details,
      uniform_player_number: printingLine?.number ? Number(printingLine.number) : null,
      uniform_nickname: String(printingLine?.nickname || '').trim() || null,
    };

    try {
      const res = await portalApi.placeUniformOrder(basePayload);

      if (res?.success) {
        toast.success(t('portal.uniforms.success'));
        setCart([]);
        setCartOpen(false);
        setActiveProduct(null);
      } else {
        toast.error(t('portal.uniforms.error'));
      }
    } catch (_error) {
      toast.error(t('portal.uniforms.error'));
    }
  }, [cart, t, toast]);

  // ---------- Catalog Card UI (famous-app style) ----------
  const ProductCard = useCallback(({ item }) => {
    const image = getDisplayImage(item);
    const name = getDisplayName(item);
    const variants = getVariants(item);
    const { min, max } = getPriceRange(item);

    let priceLabel;
    if (min == null) {
      priceLabel = t('portal.uniforms.priceNA');
    } else if (max != null && max !== min) {
      priceLabel = `${formatMoney(min)} - ${formatMoney(max)}`;
    } else {
      priceLabel = formatMoney(min);
    }

    // Check if all variants have "__one_size__" as their size
    const hasOneSizeVariants = variants.length > 0 && variants.every(v => 
      v?.size?.toLowerCase() === '__one_size__'
    );

    const sizeDisplayText = hasOneSizeVariants 
      ? t('portal.uniforms.oneSizeItem')
      : t('portal.uniforms.availableSizes');

    const sizeSeparator = t('portal.uniforms.sizeSeparator');
    const sizesList = hasOneSizeVariants 
      ? [t('portal.uniforms.oneSize')]
      : variants.map((v) => v.size);

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => setActiveProduct(item)}
        style={[styles.tile, { backgroundColor: colors.surfaceElevated || colors.surface }]}
      >
        <View style={[styles.tileMedia, { backgroundColor: colors.surface }]}>
          {image ? (
            <Image source={image} style={styles.tileImage} resizeMode="cover" />
          ) : (
            <View style={styles.tileImageFallback}>
              <Text variant="caption" color={colors.textMuted}>{t('portal.uniforms.kit')}</Text>
            </View>
          )}

        <View style={[styles.pricePill, isRTL && styles.pricePillRtl, { backgroundColor: colors.surfaceElevated || colors.surface }]}>
          <Text variant="caption" weight="semibold" color={colors.textPrimary}>
            {priceLabel}
          </Text>
        </View>
      </View>

        <View style={[styles.tileBody, isRTL && styles.alignEnd]}>
          <Text numberOfLines={2} variant="body" weight="semibold" color={colors.textPrimary}>
            {name}
          </Text>

          {!!variants.length && (
            <Text variant="caption" color={colors.textMuted} style={{ marginTop: 4 }}>
              {sizeDisplayText}: {sizesList.join(sizeSeparator)}
            </Text>
          )}

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setActiveProduct(item)}
            style={[styles.detailsBtn, { borderColor: colors.border }]}
          >
            <Text variant="caption" color={colors.textSecondary}>
              {t('portal.uniforms.viewDetails')}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  }, [colors, getDisplayImage, getDisplayName, getVariants, getPriceRange, isRTL, t]);

  // ---------- Product Detail "Bottom Sheet" ----------
  const ProductSheet = useMemo(() => {
    if (!activeProduct) return null;

    const product = activeProduct;
    const name = getDisplayName(product);
    const image = getDisplayImage(product);
    const variants = getVariants(product);
    const { min, max } = getPriceRange(product);

    // Check if all variants have "__one_size__" as their size
    const hasOneSizeVariants = variants.length > 0 && variants.every(v => 
      v?.size?.toLowerCase() === '__one_size__'
    );

    return (
      <ProductDetailsModal
        colors={colors}
        t={t}
        product={product}
        name={name}
        image={image}
        variants={variants}
        hasOneSizeVariants={hasOneSizeVariants}
        minPrice={min}
        maxPrice={max}
        isRTL={isRTL}
        isOutOfStock={(variant) => isOutOfStock(product, variant)}
        onClose={() => setActiveProduct(null)}
        onAdd={(variant) => addToCartFromProduct(product, variant)}
      />
    );
  }, [activeProduct, addToCartFromProduct, colors, getDisplayImage, getDisplayName, getPriceRange, getVariants, isRTL, t]);

  // ---------- Cart Sheet ----------
  const CartSheet = useMemo(() => (
    <Modal
      visible={cartOpen}
      animationType="slide"
      transparent
      onRequestClose={() => setCartOpen(false)}
    >
      <Pressable style={[styles.modalBackdrop, { backgroundColor: alphaHex(colors.black, '8C') }]} onPress={() => setCartOpen(false)} />
      <View style={[styles.cartSheet, isRTL && styles.rtl, { backgroundColor: colors.surfaceElevated || colors.surface }]}>
        <View style={[styles.sheetHeader, isRTL && styles.rowReverse]}>
          <Text variant="body" weight="semibold" color={colors.textPrimary}>
            {t('portal.uniforms.cartTitle', { count: cartCount })}
          </Text>
          <TouchableOpacity onPress={() => setCartOpen(false)} style={styles.sheetClose}>
            <Text variant="caption" color={colors.textMuted}>{t('portal.common.close')}</Text>
          </TouchableOpacity>
        </View>

        {cart.length === 0 ? (
          <View style={{ paddingVertical: spacing.lg }}>
            <PortalEmptyState
              icon="shopping-bag"
              title={t('portal.uniforms.emptyCartTitle')}
              description={t('portal.uniforms.emptyCartDesc')}
            />
          </View>
        ) : (
          <FlatList
            data={cart}
            keyExtractor={(x) => `${x.productId}:${x.variantId}`}
            contentContainerStyle={{ paddingBottom: 120 }}
            renderItem={({ item }) => {
              // Display "One Size" instead of "__one_size__" in cart
              const displaySize = item?.size?.toLowerCase() === '__one_size__' 
                ? t('portal.uniforms.oneSize')
                : item.size || placeholder;
                
              return (
                <View style={[styles.cartLine, isRTL && styles.rowReverse, { borderColor: colors.border }]}>
                  <View style={[styles.cartLineContent, isRTL && styles.alignEnd]}>
                    <Text variant="bodySmall" weight="semibold" color={colors.textPrimary} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text variant="caption" color={colors.textMuted} style={{ marginTop: 2 }}>
                      {t('portal.uniforms.sizeLabel', { size: displaySize, price: formatMoney(item.unitPrice) })}
                    </Text>
                  </View>

                  {/* Quantity stepper (quality as numbers - +) */}
                  <View style={[styles.stepper, isRTL && styles.rowReverse]}>
                    <TouchableOpacity
                      onPress={() => setLineQty(item.productId, item.variantId, (item.quantity || 1) - 1)}
                      style={[styles.stepBtn, { borderColor: colors.border }]}
                    >
                      <Text variant="body" weight="semibold" color={colors.textPrimary}>−</Text>
                    </TouchableOpacity>

                    <Text variant="bodySmall" weight="semibold" color={colors.textPrimary} style={{ width: 26, textAlign: 'center' }}>
                      {item.quantity}
                    </Text>

                    <TouchableOpacity
                      onPress={() => setLineQty(item.productId, item.variantId, (item.quantity || 1) + 1)}
                      style={[styles.stepBtn, { borderColor: colors.border }]}
                    >
                      <Text variant="body" weight="semibold" color={colors.textPrimary}>+</Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    onPress={() => removeCartLine(item.productId, item.variantId)}
                    style={styles.removeBtn}
                  >
                    <Text variant="caption" color={colors.error}>
                      {t('portal.common.remove')}
                    </Text>
                  </TouchableOpacity>

                  {/* Printing fields - only show if this item needs printing */}
                  {item.needPrinting ? (
                    <View style={{ marginTop: spacing.sm, width: '100%' }}>
                      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: spacing.sm }}>
                        <View style={{ flex: 1 }}>
                          <Input
                            label={t('portal.uniforms.number')}
                            placeholder={t('portal.uniforms.numberPlaceholder')}
                            keyboardType="numeric"
                            value={item.number || ''}
                            onChangeText={(v) => {
                              const clean = v.replace(/[^\d]/g, '').slice(0, 6);
                              setCartValidationError('');
                              upsertCartLine({ ...item, number: clean });
                            }}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Input
                            label={t('portal.uniforms.nickname')}
                            placeholder={t('portal.uniforms.nicknamePlaceholder')}
                            value={item.nickname || ''}
                            onChangeText={(v) => { setCartValidationError(''); upsertCartLine({ ...item, nickname: v }); }}
                          />
                        </View>
                      </View>
                    </View>
                  ) : null}
                </View>
              );
            }}
          />
        )}

        {/* Checkout area */}
        <View style={[styles.cartFooter, isRTL && styles.rowReverse, { borderColor: colors.border, backgroundColor: colors.surfaceElevated || colors.surface }]}>
          <View>
            <Text variant="caption" color={colors.textMuted}>
              {t('portal.uniforms.total')}
            </Text>
            <Text variant="body" weight="semibold" color={colors.textPrimary}>
              {formatMoney(cartTotal)}
            </Text>
          </View>

          <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end' }}>
            {cartValidationError ? (
              <Text
                variant="caption"
                color={colors.error}
                style={[styles.cartValidationError, { textAlign: isRTL ? 'right' : 'left' }]}
              >
                {cartValidationError}
              </Text>
            ) : null}
            <Button onPress={checkout} disabled={!cart.length}>
              {t('portal.uniforms.checkout')}
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  ), [cart, cartCount, cartOpen, cartTotal, cartValidationError, checkout, colors, isRTL, placeholder, removeCartLine, setLineQty, t, upsertCartLine]);

  // ---------- Main ----------
  if (((!portalReady && !storeLoadedOnce) || (loading && !storeLoadedOnce)) && !error) {
    return (
      <Screen>
        <ThemedLoader />
      </Screen>
    );
  }

  return (
    <PortalAccessGate titleOverride={t('portal.uniforms.title')} error={error} onRetry={loadCatalog} onReauthRequired={handleReauthRequired}>
    <Screen contentContainerStyle={[styles.screen, isRTL && styles.rtl]}>
      <PortalHeader
        title={t('portal.uniforms.title')}
        subtitle={t('portal.uniforms.subtitle')}
      />
      <PortalActionBanner title={t('portal.uniforms.startHereTitle')} description={t('portal.uniforms.startHereDescription')} />

      {error ? (
        <PortalEmptyState
          icon="alert-triangle"
          title={t('portal.uniforms.errorTitle')}
          description={t('portal.uniforms.error')}
          action={<Button variant="secondary" onPress={loadCatalog}>{t('portal.common.retry')}</Button>}
        />
      ) : storeLoadedOnce && catalog.length === 0 && !loading ? (
        <PortalEmptyState
          icon="shopping-bag"
          title={t('portal.uniforms.emptyTitle')}
          description={t('portal.uniforms.emptyDescription')}
        />
      ) : (
        <FlatList
          data={catalogSections}
          keyExtractor={(section) => section.key}
          style={styles.catalogList}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: section }) => (
            <View style={{ marginBottom: spacing.md }}>
              <View style={[styles.sectionRow, isRTL && styles.rowReverse]}>
                <View style={isRTL && styles.alignEnd}>
                  <Text variant="bodySmall" weight="bold" color={colors.textPrimary}>{section.title}</Text>
                  <Text variant="caption" color={colors.textMuted}>{section.key === 'required' ? t('portal.uniforms.sectionHints.required') : section.key === 'recommended' ? t('portal.uniforms.sectionHints.recommended') : t('portal.uniforms.sectionHints.optional')}</Text>
                </View>
                <Text variant="caption" color={colors.textMuted}>{section.data.length}</Text>
              </View>
              <FlatList
                data={section.data}
                keyExtractor={(item, index) => `${section.key}-${String(item?.id ?? index)}`}
                numColumns={2}
                columnWrapperStyle={{ gap: spacing.md, flexDirection: isRTL ? 'row-reverse' : 'row' }}
                scrollEnabled={false}
                renderItem={({ item }) => <ProductCard item={item} />}
              />
            </View>
          )}
        />
      )}

      {/* Sticky Cart Bar (famous app feel) */}
      <View style={[styles.cartBar, { backgroundColor: colors.surfaceElevated || colors.surface, borderColor: colors.border }]}>
        <View style={[styles.cartBarContent, isRTL && styles.rowReverse]}>
          <View style={[styles.cartSummary, isRTL && styles.alignEnd]}>
            <Text variant="caption" color={colors.textSecondary} weight="semibold">
              {t('portal.uniforms.cartTitle', { count: cartCount })}
            </Text>
            <Text variant="bodySmall" color={colors.textPrimary} weight="semibold">
              {formatMoney(cartTotal)}
            </Text>
          </View>
          <Button onPress={() => setCartOpen(true)} style={styles.viewCartButton}>
            {t('portal.uniforms.viewCart')}
          </Button>
        </View>
      </View>

      {ProductSheet}
      {CartSheet}
    </Screen>
    </PortalAccessGate>
  );
}

// ---------- Product details modal component ----------
function ProductDetailsModal({
  colors,
  t,
  product,
  name,
  image,
  variants,
  hasOneSizeVariants = false,
  minPrice,
  maxPrice,
  isRTL,
  isOutOfStock,
  onClose,
  onAdd,
}) {
  const [selectedVariantId, setSelectedVariantId] = useState(variants?.[0]?.id ?? null);
  const [selectionError, setSelectionError] = useState('');

  useEffect(() => {
    setSelectedVariantId(variants?.[0]?.id ?? null);
    setSelectionError('');
  }, [product?.id, variants]); // reset when product changes

  const selectedVariant = useMemo(() => {
    if (!variants?.length) return null;
    return variants.find((v) => v.id === selectedVariantId) || variants[0];
  }, [selectedVariantId, variants]);

  const priceLabel = useMemo(() => {
    if (selectedVariant && Number.isFinite(Number(selectedVariant.price))) {
      return formatMoney(selectedVariant.price);
    }
    if (minPrice == null) return t('portal.uniforms.priceNA');
    if (maxPrice != null && maxPrice !== minPrice) return `${formatMoney(minPrice)} - ${formatMoney(maxPrice)}`;
    return formatMoney(minPrice);
  }, [maxPrice, minPrice, selectedVariant, t]);

  const selectedOutOfStock = useMemo(
    () => (typeof isOutOfStock === 'function' ? !!isOutOfStock(selectedVariant || null) : false),
    [isOutOfStock, selectedVariant]
  );

  return (
    <Modal visible={!!product} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={[styles.modalBackdrop, { backgroundColor: alphaHex(colors.black, '8C') }]} onPress={onClose} />

      <View style={[styles.sheet, isRTL && styles.rtl, { backgroundColor: colors.surfaceElevated || colors.surface }]}>
        <View style={[styles.sheetHeader, isRTL && styles.rowReverse]}>
          <Text variant="body" weight="semibold" color={colors.textPrimary} numberOfLines={1}>
            {name}
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.sheetClose}>
            <Text variant="caption" color={colors.textMuted}>{t('portal.common.close')}</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.hero, { backgroundColor: colors.surface }]}>
          {image ? (
            <Image source={image} style={styles.heroImage} resizeMode="cover" />
          ) : (
            <View style={styles.heroFallback}>
              <Text variant="caption" color={colors.textMuted}>{t('portal.uniforms.kit')}</Text>
            </View>
          )}

          <View style={[styles.heroPrice, isRTL && styles.heroPriceRtl, { backgroundColor: colors.surfaceElevated || colors.surface }]}>
            <Text variant="bodySmall" weight="semibold" color={colors.textPrimary}>
              {priceLabel}
            </Text>
          </View>
        </View>

        {!!product?.description ? (
          <Text variant="bodySmall" color={colors.textSecondary} style={{ marginTop: spacing.sm, textAlign: isRTL ? 'right' : 'left' }}>
            {product.description}
          </Text>
        ) : null}

        {/* Sizes as select labels (chips) */}
        {!!variants?.length ? (
          <View style={{ marginTop: spacing.md }}>
            <Text variant="caption" color={colors.textMuted} style={{ marginBottom: spacing.xs }}>
              {hasOneSizeVariants 
                ? t('portal.uniforms.oneSizeItem')
                : t('portal.uniforms.size')}
            </Text>

            <View style={[styles.chipsRow, isRTL && styles.rowReverse]}>
              {variants.map((v) => {
                const active = v.id === selectedVariantId;
                // Display "One Size" instead of "__one_size__"
                const displaySize = v?.size?.toLowerCase() === '__one_size__'
                  ? t('portal.uniforms.oneSize')
                  : v.size;
                  
                return (
                  <TouchableOpacity
                    key={v.id}
                    onPress={() => setSelectedVariantId(v.id)}
                    style={[
                      styles.chip,
                      {
                        borderColor: active ? colors.accentOrange : colors.border,
                        backgroundColor: active ? alphaHex(colors.accentOrange, '24') : 'transparent',
                      },
                    ]}
                  >
                    <Text variant="bodySmall" weight="semibold" color={active ? colors.accentOrange : colors.textPrimary}>
                      {displaySize}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ) : null}

        <View style={{ marginTop: spacing.lg }}>
          {selectionError ? <Text variant="caption" color={colors.error} style={{ marginBottom: spacing.xs }}>{selectionError}</Text> : null}
          {selectedOutOfStock ? (
            <Text variant="caption" color={colors.error} style={{ marginBottom: spacing.xs }}>
              {t('portal.uniforms.outOfStock')}
            </Text>
          ) : null}
          <Button onPress={() => {
            if (variants?.length && !selectedVariant) {
              setSelectionError(t('portal.uniforms.selectSize'));
              return;
            }
            setSelectionError('');
            onAdd(selectedVariant);
          }} disabled={selectedOutOfStock}>
            {t('portal.uniforms.addToCart')}
          </Button>
        </View>

        <View style={{ height: spacing.lg }} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  rowReverse: {
    flexDirection: 'row-reverse',
  },
  alignEnd: {
    alignItems: 'flex-end',
  },
  screen: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: 96, // room for cart bar
  },

  grid: {
    paddingTop: spacing.md,
    paddingBottom: 140,
    gap: spacing.md,
  },
  catalogList: {
    flex: 1,
  },

  tile: {
    flex: 1,
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  tileMedia: {
    height: 152,
    position: 'relative',
  },
  tileImage: {
    width: '100%',
    height: '100%',
  },
  tileImageFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pricePill: {
    position: 'absolute',
    left: spacing.sm,
    bottom: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: 999,
  },
  pricePillRtl: {
    left: undefined,
    right: spacing.sm,
  },
  tileBody: {
    padding: spacing.md,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  detailsBtn: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },

  // Sticky cart bar
  cartBar: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    borderWidth: 1,
    borderRadius: 18,
    padding: spacing.sm,
  },
  cartBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cartSummary: {
    flex: 1,
  },
  viewCartButton: {
    minWidth: 132,
  },

  // Modal + sheets
  modalBackdrop: {
    flex: 1,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: spacing.lg,
  },
  cartSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: '18%',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: spacing.lg,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sheetClose: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },

  hero: {
    height: 240,
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroPrice: {
    position: 'absolute',
    right: spacing.sm,
    bottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: 999,
  },
  heroPriceRtl: {
    right: undefined,
    left: spacing.sm,
  },

  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },

  // Cart
  cartLine: {
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    alignItems: 'center',
  },
  cartLineContent: {
    flex: 1,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepBtn: {
    borderWidth: 1,
    borderRadius: 12,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  cartValidationError: {
    marginBottom: 4,
    maxWidth: 220,
  },
  cartFooter: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    borderWidth: 1,
    borderRadius: 18,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  rtl: {
    direction: 'rtl',
  },
});
