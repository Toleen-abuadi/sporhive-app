// src/screens/portal/UniformStoreScreen.js
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Image, Pressable, RefreshControl, Text, TextInput, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { useI18n } from '../../services/i18n/i18n';
import { portalApi } from '../../services/portal/portal.api';
import { portalStyles } from '../../theme/portal.styles';
import { Card, ErrorBanner, PortalHeader, PortalScreen, PrimaryButton, SkeletonBlock } from '../../components/portal/PortalPrimitives';

const asDataUri = (base64) => {
  if (!base64) return null;
  if (base64.startsWith('data:')) return base64;
  return `data:image/jpeg;base64,${base64}`;
};

const debounce = (fn, ms = 220) => {
  let t = null;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
};

const TabSwitch = React.memo(function TabSwitch({ tab, setTab }) {
  return (
    <View style={portalStyles.segmentWrap}>
      {['catalog', 'orders'].map((k) => {
        const active = tab === k;
        return (
          <Pressable
            key={k}
            onPress={() => setTab(k)}
            style={({ pressed }) => [portalStyles.segmentBtn, active && portalStyles.segmentBtnActive, pressed && portalStyles.pressed]}
          >
            <Text style={[portalStyles.segmentText, active && portalStyles.segmentTextActive]}>{k === 'catalog' ? 'Store' : 'My Orders'}</Text>
          </Pressable>
        );
      })}
    </View>
  );
});

const VariantPill = React.memo(function VariantPill({ active, label, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        portalStyles.variantPill,
        active && portalStyles.variantPillActive,
        pressed && portalStyles.pressed,
      ]}
    >
      <Text style={[portalStyles.variantText, active && portalStyles.variantTextActive]}>{label}</Text>
    </Pressable>
  );
});

const QtyStepper = React.memo(function QtyStepper({ value, onChange }) {
  return (
    <View style={portalStyles.qtyWrap}>
      <Pressable onPress={() => onChange(Math.max(1, value - 1))} style={({ pressed }) => [portalStyles.qtyBtn, pressed && portalStyles.pressed]}>
        <Text style={portalStyles.qtyBtnText}>−</Text>
      </Pressable>
      <Text style={portalStyles.qtyValue}>{value}</Text>
      <Pressable onPress={() => onChange(value + 1)} style={({ pressed }) => [portalStyles.qtyBtn, pressed && portalStyles.pressed]}>
        <Text style={portalStyles.qtyBtnText}>+</Text>
      </Pressable>
    </View>
  );
});

const ProductCard = React.memo(function ProductCard({ item, onUpdateCart }) {
  const [variantId, setVariantId] = useState(item?.variants?.[0]?.id ?? null);
  const [qty, setQty] = useState(1);
  const [playerNumber, setPlayerNumber] = useState('');
  const [nickname, setNickname] = useState('');

  const selected = useMemo(
    () => (item?.variants || []).find((v) => v?.id === variantId) || item?.variants?.[0] || null,
    [item?.variants, variantId]
  );

  const debouncedUpdate = useMemo(
    () =>
      debounce((payload) => onUpdateCart(payload), 180),
    [onUpdateCart]
  );

  useEffect(() => {
    debouncedUpdate({
      product_id: item?.id,
      variant_id: selected?.id,
      quantity: qty,
      need_printing: !!item?.need_printing,
      player_number: playerNumber,
      nickname,
    });
  }, [debouncedUpdate, item?.id, item?.need_printing, nickname, playerNumber, qty, selected?.id]);

  const img = useMemo(() => asDataUri(item?.photo_base64 || item?.image_base64 || item?.photo), [item?.photo_base64, item?.image_base64, item?.photo]);

  return (
    <Card style={portalStyles.productCard}>
      <View style={portalStyles.productTop}>
        <View style={portalStyles.productImgWrap}>
          {img ? <Image source={{ uri: img }} style={portalStyles.productImg} /> : <View style={portalStyles.productImgFallback} />}
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={portalStyles.productName} numberOfLines={2}>
            {item?.name_localized || item?.name || '—'}
          </Text>

          {!!item?.need_printing && (
            <View style={[portalStyles.badge, portalStyles.badgeWarn, { alignSelf: 'flex-start', marginTop: 6 }]}>
              <Text style={portalStyles.badgeText}>Printing</Text>
            </View>
          )}

          <Text style={[portalStyles.muted, { marginTop: 6 }]} numberOfLines={1}>
            {selected ? `${selected?.size || selected?.name || 'Variant'} • ${selected?.price ?? ''}` : '—'}
          </Text>
        </View>
      </View>

      <View style={portalStyles.variantRow}>
        {(item?.variants || []).slice(0, 8).map((v) => (
          <VariantPill
            key={String(v?.id)}
            active={v?.id === variantId}
            label={`${v?.size || v?.name || 'Size'} • ${v?.price ?? ''}${v?.stock != null ? ` • ${v.stock}` : ''}`}
            onPress={() => setVariantId(v?.id)}
          />
        ))}
      </View>

      <View style={portalStyles.productBottom}>
        <QtyStepper value={qty} onChange={setQty} />
        <Text style={portalStyles.productPrice}>
          {selected?.price != null ? String(selected.price) : ''}
        </Text>
      </View>

      {!!item?.need_printing && (
        <View style={{ marginTop: 10 }}>
          <Text style={portalStyles.muted}>Printing details</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
            <TextInput
              placeholder="Number"
              placeholderTextColor="#A9B4CC"
              value={playerNumber}
              onChangeText={setPlayerNumber}
              style={[portalStyles.input, { flex: 1 }]}
            />
            <TextInput
              placeholder="Nickname"
              placeholderTextColor="#A9B4CC"
              value={nickname}
              onChangeText={setNickname}
              style={[portalStyles.input, { flex: 1 }]}
            />
          </View>
        </View>
      )}
    </Card>
  );
});

const OrderRow = React.memo(function OrderRow({ item }) {
  const status = String(item?.status || '').toLowerCase();
  const badgeStyle = status.includes('pending') ? portalStyles.badgeWarn : status.includes('collected') || status.includes('received') ? portalStyles.badgeSuccess : portalStyles.badgeNeutral;

  return (
    <Card style={portalStyles.orderRow}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, marginRight: 10 }}>
          <Text style={portalStyles.payTitle} numberOfLines={1}>
            {item?.product_name || item?.title || 'Order'}
          </Text>
          <Text style={portalStyles.muted} numberOfLines={2}>
            {item?.variant_name || item?.size || ''}{item?.quantity ? ` • Qty: ${item.quantity}` : ''}
          </Text>
          {!!item?.created_at && <Text style={[portalStyles.muted, { marginTop: 6 }]}>Created: {new Date(item.created_at).toLocaleDateString()}</Text>}
        </View>
        <View style={[portalStyles.badge, badgeStyle]}>
          <Text style={portalStyles.badgeText}>{item?.status || '—'}</Text>
        </View>
      </View>
    </Card>
  );
});

export default function UniformStoreScreen() {
  const { t } = useI18n();
  const [tab, setTab] = useState('catalog');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [orders, setOrders] = useState([]);

  // cart state: map by product_id
  const cartRef = useRef({});

  const load = useCallback(async (mode = 'initial') => {
    try {
      mode === 'initial' ? setLoading(true) : setRefreshing(true);
      setError(null);

      const [storeRes, ordersRes] = await Promise.all([portalApi.listUniformStore(), portalApi.listMyUniformOrders({})]);

      const store = storeRes?.data ?? storeRes;
      const myOrders = ordersRes?.data ?? ordersRes;

      setCatalog(Array.isArray(store?.products) ? store.products : Array.isArray(store) ? store : []);
      setOrders(Array.isArray(myOrders?.orders) ? myOrders.orders : Array.isArray(myOrders) ? myOrders : []);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load('initial');
  }, [load]);

  const onRefresh = useCallback(() => load('refresh'), [load]);

  const onUpdateCart = useCallback((payload) => {
    if (!payload?.product_id) return;
    cartRef.current = {
      ...cartRef.current,
      [payload.product_id]: payload,
    };
  }, []);

  const cartItems = useMemo(() => Object.values(cartRef.current || {}).filter((x) => x?.variant_id && x?.quantity), [catalog, tab]); // re-evaluate when tab/catalog changes

  const onPlaceOrder = useCallback(async () => {
    try {
      const payload = {
        items: cartItems.map((x) => ({
          product_id: x.product_id,
          variant_id: x.variant_id,
          quantity: x.quantity,
          need_printing: !!x.need_printing,
          player_number: x.player_number || null,
          nickname: x.nickname || null,
        })),
      };
      await portalApi.createUniformOrder(payload);
      // clear cart after success
      cartRef.current = {};
      await load('refresh');
      setTab('orders');
    } catch (e) {
      setError(e);
    }
  }, [cartItems, load]);

  return (
    <PortalScreen>
      <FlatList
        data={[{ id: 'store' }]}
        keyExtractor={(i) => i.id}
        renderItem={() => (
          <View style={{ paddingBottom: 120 }}>
            <PortalHeader title={t('portal.store.title', 'Uniform Store')} subtitle={t('portal.store.subtitle', 'Order your kit in minutes')} />

            <View style={{ marginTop: 10 }}>
              <TabSwitch tab={tab} setTab={setTab} />
            </View>

            {loading ? (
              <View style={{ marginTop: 12 }}>
                {[0, 1].map((i) => (
                  <Card key={i} style={portalStyles.productCard}>
                    <View style={{ flexDirection: 'row' }}>
                      <SkeletonBlock h={64} w={64} r={16} />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <SkeletonBlock h={14} w="70%" r={8} />
                        <SkeletonBlock h={10} w="50%" r={8} style={{ marginTop: 10 }} />
                      </View>
                    </View>
                    <SkeletonBlock h={34} w="100%" r={14} style={{ marginTop: 12 }} />
                  </Card>
                ))}
              </View>
            ) : error ? (
              <ErrorBanner title={t('portal.errors.storeTitle', 'Could not load store')} desc={error?.message} onRetry={onRefresh} />
            ) : tab === 'catalog' ? (
              <>
                {catalog.length ? (
                  <Animated.View entering={FadeInUp.duration(220)} style={{ marginTop: 10 }}>
                    <FlatList
                      data={catalog}
                      keyExtractor={(p, idx) => String(p?.id || idx)}
                      renderItem={({ item }) => <ProductCard item={item} onUpdateCart={onUpdateCart} />}
                      scrollEnabled={false}
                      removeClippedSubviews
                      initialNumToRender={6}
                      maxToRenderPerBatch={6}
                      windowSize={7}
                    />
                  </Animated.View>
                ) : (
                  <Card style={{ marginTop: 10 }}>
                    <Text style={portalStyles.emptyTitle}>{t('portal.store.emptyTitle', 'No products')}</Text>
                    <Text style={portalStyles.muted}>{t('portal.store.emptyDesc', 'Products will show here when available.')}</Text>
                  </Card>
                )}
              </>
            ) : (
              <>
                {orders.length ? (
                  <Animated.View entering={FadeInUp.duration(220)} style={{ marginTop: 10 }}>
                    <FlatList
                      data={orders}
                      keyExtractor={(o, idx) => String(o?.id || o?.uuid || idx)}
                      renderItem={({ item }) => <OrderRow item={item} />}
                      scrollEnabled={false}
                      removeClippedSubviews
                      initialNumToRender={10}
                      maxToRenderPerBatch={10}
                      windowSize={9}
                    />
                  </Animated.View>
                ) : (
                  <Card style={{ marginTop: 10 }}>
                    <Text style={portalStyles.emptyTitle}>{t('portal.store.ordersEmptyTitle', 'No orders')}</Text>
                    <Text style={portalStyles.muted}>{t('portal.store.ordersEmptyDesc', 'Your uniform orders will appear here.')}</Text>
                  </Card>
                )}
              </>
            )}
          </View>
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F97316" />}
        contentContainerStyle={portalStyles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {tab === 'catalog' && !!cartItems.length && (
        <View style={portalStyles.stickyBar}>
          <View style={{ flex: 1 }}>
            <Text style={portalStyles.stickyTitle}>Cart ready</Text>
            <Text style={portalStyles.muted}>{cartItems.length} item(s)</Text>
          </View>
          <PrimaryButton title="Place Order" onPress={onPlaceOrder} />
        </View>
      )}
    </PortalScreen>
  );
}
