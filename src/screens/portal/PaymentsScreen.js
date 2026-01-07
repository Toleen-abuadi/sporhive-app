// src/screens/portal/PaymentsScreen.js
import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View, Linking } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { useI18n } from '../../services/i18n/i18n';
import { usePortalOverview } from '../../services/portal/portal.hooks';
import { portalApi } from '../../services/portal/portal.api';
import { portalStyles } from '../../theme/portal.styles';
import { Card, ErrorBanner, PortalHeader, PortalScreen, SkeletonBlock } from '../../components/portal/PortalPrimitives';

const fmtMoney = (v) => {
  const n = Number(v);
  if (Number.isNaN(n)) return String(v ?? '');
  return `${n.toFixed(2)}`;
};

const fmtDate = (d) => {
  if (!d) return '';
  const x = new Date(d);
  return Number.isNaN(x.getTime()) ? '' : x.toLocaleDateString();
};

const isPaid = (p) => String(p?.status || '').toLowerCase().includes('paid');
const isPending = (p) => String(p?.status || '').toLowerCase().includes('pending') || String(p?.status || '').toLowerCase().includes('due');

const Segmented = React.memo(function Segmented({ value, onChange }) {
  const items = [
    { key: 'all', label: 'All' },
    { key: 'paid', label: 'Paid' },
    { key: 'pending', label: 'Pending' },
  ];
  return (
    <View style={portalStyles.segmentWrap}>
      {items.map((it) => {
        const active = value === it.key;
        return (
          <Pressable
            key={it.key}
            onPress={() => onChange(it.key)}
            style={({ pressed }) => [portalStyles.segmentBtn, active && portalStyles.segmentBtnActive, pressed && portalStyles.pressed]}
          >
            <Text style={[portalStyles.segmentText, active && portalStyles.segmentTextActive]}>{it.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
});

const PaymentRow = React.memo(function PaymentRow({ item, onPrint }) {
  const status = String(item?.status || '').toLowerCase();
  const badgeStyle = status.includes('paid')
    ? portalStyles.badgeSuccess
    : status.includes('pending') || status.includes('due')
      ? portalStyles.badgeWarn
      : portalStyles.badgeNeutral;

  return (
    <Card style={portalStyles.payRow}>
      <View style={portalStyles.payTop}>
        <View style={{ flex: 1 }}>
          <Text style={portalStyles.payTitle} numberOfLines={1}>
            {item?.type || item?.sub_type || 'Payment'}
          </Text>
          <Text style={portalStyles.muted}>
            {fmtDate(item?.due_date)}{!!item?.paid_on ? ` • Paid: ${fmtDate(item?.paid_on)}` : ''}
          </Text>
        </View>
        <View style={[portalStyles.badge, badgeStyle]}>
          <Text style={portalStyles.badgeText}>{item?.status || '—'}</Text>
        </View>
      </View>

      <View style={portalStyles.payBottom}>
        <Text style={portalStyles.payAmount}>{fmtMoney(item?.amount)}</Text>

        <Pressable onPress={() => onPrint(item)} style={({ pressed }) => [portalStyles.printBtn, pressed && portalStyles.pressed]}>
          <Text style={portalStyles.printBtnText}>Print Invoice</Text>
        </Pressable>
      </View>

      {!!item?.fee_breakdown && (
        <View style={{ marginTop: 10 }}>
          <Text style={portalStyles.muted}>Breakdown</Text>
          {Object.entries(item.fee_breakdown).slice(0, 6).map(([k, v]) => (
            <Text key={k} style={portalStyles.breakdownLine}>
              • {k}: {fmtMoney(v)}
            </Text>
          ))}
        </View>
      )}
    </Card>
  );
});

async function openPdfFromResult(result) {
  // Best path: expo-file-system + expo-sharing
  let FileSystem = null;
  let Sharing = null;
  try {
    FileSystem = require('expo-file-system');
  } catch {}
  try {
    Sharing = require('expo-sharing');
  } catch {}

  const url = result?.url || result?.file_url || result?.pdf_url;

  if (url) {
    // If backend provides a URL, open it.
    await Linking.openURL(url);
    return;
  }

  const b64 = result?.file_base64 || result?.base64 || result?.pdf_base64;
  if (b64 && FileSystem) {
    const filename = result?.filename || 'invoice.pdf';
    const path = `${FileSystem.cacheDirectory}${filename}`;

    await FileSystem.writeAsStringAsync(path, b64, { encoding: FileSystem.EncodingType.Base64 });

    if (Sharing && (await Sharing.isAvailableAsync())) {
      await Sharing.shareAsync(path, { mimeType: 'application/pdf', dialogTitle: 'Invoice' });
      return;
    }

    await Linking.openURL(path);
    return;
  }

  // Fallback (nothing usable)
  throw new Error('Invoice not available in supported format.');
}

export default function PaymentsScreen() {
  const { t } = useI18n();
  const { overview, loading, refreshing, error, refresh } = usePortalOverview();

  const [filter, setFilter] = useState('all'); // all|paid|pending
  const [sort, setSort] = useState('desc'); // desc|asc
  const [printingId, setPrintingId] = useState(null);

  const raw = overview?.payment_info || [];

  const items = useMemo(() => {
    let list = raw.slice();

    if (filter === 'paid') list = list.filter(isPaid);
    if (filter === 'pending') list = list.filter(isPending);

    list.sort((a, b) => {
      const da = new Date(a?.due_date || a?.created_at || 0).getTime();
      const db = new Date(b?.due_date || b?.created_at || 0).getTime();
      return sort === 'asc' ? da - db : db - da;
    });

    return list;
  }, [raw, filter, sort]);

  const onPrint = useCallback(async (payment) => {
    const id = payment?.id || payment?.payment_id || payment?.uuid || `${payment?.due_date || 'x'}`;
    try {
      setPrintingId(id);

      // send identifiers as backend requires (we pass the whole known object, safe)
      const res = await portalApi.printInvoice({
        payment_id: payment?.id || payment?.payment_id,
        invoice_id: payment?.invoice_id,
        reference: payment?.reference,
        // extra payload if backend expects it:
        raw: payment,
      });

      await openPdfFromResult(res?.data ?? res);
    } finally {
      setPrintingId(null);
    }
  }, []);

  const data = useMemo(() => [{ id: 'payments' }], []);

  return (
    <PortalScreen>
      <FlatList
        data={data}
        keyExtractor={(i) => i.id}
        renderItem={() => (
          <View style={{ paddingBottom: 24 }}>
            <PortalHeader
              title={t('portal.payments.title', 'Payments')}
              subtitle={t('portal.payments.subtitle', 'Invoices, due dates, and history')}
              right={
                <Pressable
                  onPress={() => setSort((s) => (s === 'asc' ? 'desc' : 'asc'))}
                  style={({ pressed }) => [portalStyles.sortBtn, pressed && portalStyles.pressed]}
                >
                  <Text style={portalStyles.sortBtnText}>{sort === 'asc' ? '↑' : '↓'}</Text>
                </Pressable>
              }
            />

            {loading ? (
              <View style={{ marginTop: 12 }}>
                {[0, 1, 2].map((i) => (
                  <Card key={i} style={portalStyles.payRow}>
                    <SkeletonBlock h={14} w="55%" r={8} />
                    <SkeletonBlock h={10} w="70%" r={8} style={{ marginTop: 10 }} />
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
                      <SkeletonBlock h={18} w="30%" r={10} />
                      <SkeletonBlock h={16} w="30%" r={10} />
                    </View>
                  </Card>
                ))}
              </View>
            ) : error ? (
              <ErrorBanner title={t('portal.errors.overviewTitle', 'Could not load overview')} desc={error?.message} onRetry={refresh} />
            ) : (
              <>
                <View style={{ marginTop: 10 }}>
                  <Segmented value={filter} onChange={setFilter} />
                </View>

                {items.length ? (
                  <Animated.View entering={FadeInUp.duration(220)} style={{ marginTop: 10 }}>
                    <FlatList
                      data={items}
                      keyExtractor={(p, idx) => String(p?.id || p?.payment_id || p?.invoice_id || idx)}
                      renderItem={({ item }) => (
                        <PaymentRow
                          item={{
                            ...item,
                            status: printingId && (item?.id === printingId || item?.payment_id === printingId) ? 'printing…' : item?.status,
                          }}
                          onPrint={onPrint}
                        />
                      )}
                      scrollEnabled={false}
                      removeClippedSubviews
                      initialNumToRender={8}
                      maxToRenderPerBatch={8}
                      windowSize={7}
                    />
                  </Animated.View>
                ) : (
                  <Card style={{ marginTop: 10 }}>
                    <Text style={portalStyles.emptyTitle}>{t('portal.payments.emptyTitle', 'No payments')}</Text>
                    <Text style={portalStyles.muted}>{t('portal.payments.emptyDesc', 'When payments exist, they will appear here.')}</Text>
                  </Card>
                )}
              </>
            )}
          </View>
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#F97316" />}
        contentContainerStyle={portalStyles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </PortalScreen>
  );
}
