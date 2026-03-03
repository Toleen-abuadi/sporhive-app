import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { AppScreen } from '../../components/ui/AppScreen';
import { AppHeader } from '../../components/ui/AppHeader';
import { Card } from '../../components/ui/Card';
import { Text } from '../../components/ui/Text';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { PortalStatusBadge } from '../../components/portal/PortalStatusBadge';
import { PortalSection } from '../../components/portal/PortalSection';
import { PortalActionBanner } from '../../components/portal/PortalActionBanner';
import { PortalInfoAccordion } from '../../components/portal/PortalInfoAccordion';
import { PortalTimeline } from '../../components/portal/PortalTimeline';
import { getMappedStatus } from '../../portal/statusMaps';
import { getGlossaryHelp } from '../../portal/portalGlossary';
import { useTheme } from '../../theme/ThemeProvider';
import { useI18n } from '../../services/i18n/i18n';
import { usePlayerPortalActions, usePlayerPortalStore } from '../../stores/playerPortal.store';
import { PortalAccessGate } from '../../components/portal/PortalAccessGate';
import { useToast } from '../../components/ui/ToastHost';
import { spacing } from '../../theme/tokens';
import { useSmartBack } from '../../navigation/useSmartBack';
import { getPaymentKindLabel } from '../../utils/paymentLabel';

const stepIndexForStatus = (status) => {
  const normalized = String(status || '').toLowerCase();
  if (normalized.includes('paid')) return 3;
  if (normalized.includes('pending') || normalized.includes('processing')) return 2;
  if (normalized.includes('unpaid') || normalized.includes('overdue')) return 1;
  return 0;
};

const URL_KEYS = ['url', 'file_url', 'fileUrl', 'download_url', 'downloadUrl', 'invoice_url', 'invoiceUrl', 'receipt_url', 'receiptUrl', 'link'];
const BASE64_KEYS = ['base64', 'file_base64', 'fileBase64', 'pdf_base64', 'pdfBase64', 'content'];
const FILE_NAME_KEYS = ['file_name', 'fileName', 'filename', 'name'];
const MIME_TYPE_KEYS = ['mime_type', 'mimeType', 'content_type', 'contentType'];

const toArrayBuffer = (value) => {
  if (value instanceof ArrayBuffer) return value;
  if (ArrayBuffer.isView(value)) {
    const view = value;
    return view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength);
  }
  return null;
};

const getFirstString = (source, keys = []) => {
  if (!source || typeof source !== 'object') return '';
  for (const key of keys) {
    const value = source?.[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
};

const extractDataUrl = (value) => {
  if (typeof value !== 'string') return null;
  const match = value.trim().match(/^data:([^;]+);base64,(.+)$/i);
  if (!match) return null;
  return {
    mimeType: match[1] || '',
    base64: (match[2] || '').replace(/\s+/g, ''),
  };
};

const looksLikeBase64 = (value) =>
  typeof value === 'string' &&
  value.length > 32 &&
  /^[A-Za-z0-9+/=\r\n]+$/.test(value) &&
  value.replace(/\s+/g, '').length % 4 === 0;

const arrayBufferToBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer);
  if (typeof globalThis?.Buffer?.from === 'function') {
    return globalThis.Buffer.from(bytes).toString('base64');
  }

  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  if (typeof globalThis?.btoa === 'function') {
    return globalThis.btoa(binary);
  }
  return '';
};

const decodeArrayBufferToText = (buffer) => {
  try {
    if (typeof TextDecoder !== 'undefined') {
      return new TextDecoder('utf-8').decode(new Uint8Array(buffer));
    }
  } catch { }

  try {
    if (typeof globalThis?.Buffer?.from === 'function') {
      return globalThis.Buffer.from(new Uint8Array(buffer)).toString('utf-8');
    }
  } catch { }

  return '';
};

const inferExtension = ({ url, mimeType, fileName }) => {
  const fromName = String(fileName || '').match(/\.([a-z0-9]{2,8})$/i)?.[1];
  if (fromName) return fromName.toLowerCase();

  if (typeof mimeType === 'string' && mimeType.toLowerCase().includes('pdf')) return 'pdf';

  const target = String(url || '');
  const fromUrl = target.match(/\.([a-z0-9]{2,8})(?:$|[?#])/i)?.[1];
  if (fromUrl) return fromUrl.toLowerCase();

  return 'pdf';
};

const sanitizeBaseName = (value) =>
  String(value || '')
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '') || 'receipt';

const buildTargetUri = ({ invoiceId, fileName, extension }) => {
  const baseDir = FileSystem.documentDirectory;
  if (!baseDir) throw new Error('document_directory_unavailable');

  const rawName = fileName ? sanitizeBaseName(fileName.replace(/\.[a-z0-9]{2,8}$/i, '')) : `receipt_${sanitizeBaseName(invoiceId || Date.now())}`;
  const ext = (extension || 'pdf').replace(/[^a-z0-9]/gi, '').toLowerCase() || 'pdf';
  return `${baseDir}${rawName}.${ext}`;
};

const parseReceiptPayload = (input) => {
  const queue = [input];
  const seen = new Set();

  while (queue.length) {
    const current = queue.shift();
    if (current == null) continue;

    if (typeof current === 'string') {
      const value = current.trim();
      if (!value) continue;

      if (/^https?:\/\//i.test(value)) {
        return { kind: 'url', url: value };
      }

      const dataUrl = extractDataUrl(value);
      if (dataUrl?.base64) {
        return { kind: 'base64', base64: dataUrl.base64, mimeType: dataUrl.mimeType };
      }

      if (looksLikeBase64(value)) {
        return { kind: 'base64', base64: value.replace(/\s+/g, '') };
      }

      if ((value.startsWith('{') && value.endsWith('}')) || (value.startsWith('[') && value.endsWith(']'))) {
        try {
          queue.push(JSON.parse(value));
        } catch { }
      }

      continue;
    }

    const binary = toArrayBuffer(current);
    if (binary) {
      const maybeText = decodeArrayBufferToText(binary).trim();
      if (maybeText) {
        if (/^https?:\/\//i.test(maybeText)) return { kind: 'url', url: maybeText };

        const dataUrl = extractDataUrl(maybeText);
        if (dataUrl?.base64) {
          return { kind: 'base64', base64: dataUrl.base64, mimeType: dataUrl.mimeType };
        }

        if (looksLikeBase64(maybeText)) {
          return { kind: 'base64', base64: maybeText.replace(/\s+/g, '') };
        }

        if ((maybeText.startsWith('{') && maybeText.endsWith('}')) || (maybeText.startsWith('[') && maybeText.endsWith(']'))) {
          try {
            queue.push(JSON.parse(maybeText));
            continue;
          } catch { }
        }
      }

      const base64 = arrayBufferToBase64(binary);
      if (base64) return { kind: 'base64', base64 };
      continue;
    }

    if (typeof current === 'object') {
      if (seen.has(current)) continue;
      seen.add(current);

      const fileName = getFirstString(current, FILE_NAME_KEYS);
      const mimeType = getFirstString(current, MIME_TYPE_KEYS);
      const url = getFirstString(current, URL_KEYS);
      if (url && /^https?:\/\//i.test(url)) return { kind: 'url', url, fileName, mimeType };

      const base64 = getFirstString(current, BASE64_KEYS);
      if (base64) {
        const dataUrl = extractDataUrl(base64);
        return {
          kind: 'base64',
          base64: (dataUrl?.base64 || base64).replace(/\s+/g, ''),
          fileName,
          mimeType: dataUrl?.mimeType || mimeType,
        };
      }

      const nestedKeys = ['data', 'payload', 'result', 'file', 'invoice', 'receipt'];
      nestedKeys.forEach((key) => {
        if (current?.[key] != null) queue.push(current[key]);
      });
    }
  }

  return null;
};

const saveReceiptFile = async ({ payload, invoiceId }) => {
  const parsed = parseReceiptPayload(payload);
  if (!parsed) throw new Error('receipt_payload_unrecognized');

  const extension = inferExtension(parsed);
  const targetUri = buildTargetUri({ invoiceId, fileName: parsed.fileName, extension });

  if (parsed.kind === 'url') {
    const downloadResult = await FileSystem.downloadAsync(parsed.url, targetUri);
    return downloadResult?.uri || targetUri;
  }

  if (!parsed.base64) throw new Error('receipt_base64_missing');

  await FileSystem.writeAsStringAsync(targetUri, parsed.base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return targetUri;
};

export function PortalPaymentDetailScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { goBack } = useSmartBack({ fallbackRoute: '/portal/payments' });
  const { colors } = useTheme();
  const i18n = useI18n();
  const { t } = i18n;

  // Robust language getter (covers different hook shapes)
  const currentLang =
    i18n?.currentLang ||
    i18n?.lang ||
    i18n?.language ||
    i18n?.i18n?.language ||
    i18n?.i18next?.language ||
    'en';
  const toast = useToast();
  const { payments } = usePlayerPortalStore((state) => ({ payments: state.payments }));
  const actions = usePlayerPortalActions();
  const [downloading, setDownloading] = useState(false);
  const resolvedInvoiceId = useMemo(() => {
    const raw = params?.invoiceId ?? params?.id;
    const value = Array.isArray(raw) ? raw[0] : raw;
    return typeof value === 'string' ? value.trim() : value ? String(value).trim() : '';
  }, [params]);
  const hasInvoiceId = Boolean(resolvedInvoiceId);

  useEffect(() => {
    if (!hasInvoiceId) return;
    if (!payments || payments.length === 0) actions.fetchPayments();
  }, [actions, hasInvoiceId, payments]);

  const payment = useMemo(() => {
    return (payments || []).find(
      (item) => String(item?.invoiceId || item?.id) === String(resolvedInvoiceId),
    );
  }, [payments, resolvedInvoiceId]);

  if (!hasInvoiceId) {
    return (
      <AppScreen safe>
        <AppHeader title={t('portal.payments.detailTitle')} onBackPress={goBack} />
        <EmptyState
          title={t('errors.missingParamsTitle')}
          message={t('errors.missingParamsMessage')}
          actionLabel={t('common.goBack')}
          onAction={goBack}
          secondaryActionLabel={t('common.goHome')}
          onSecondaryAction={() => router.push('/portal/payments')}
        />
      </AppScreen>
    );
  }

  if (!payment) {
    return (
      <AppScreen safe>
        <AppHeader title={t('portal.payments.detailTitle')} onBackPress={goBack} />
        <EmptyState title={t('portal.payments.detailMissingTitle')} message={t('portal.payments.detailMissingDescription')} actionLabel={t('portal.common.back')} onAction={goBack} />
      </AppScreen>
    );
  }

  const statusMeta = getMappedStatus('payment', payment?.status);
  const isUnpaid = ['unpaid', 'pending', 'overdue'].some((s) => String(payment?.status || '').toLowerCase().includes(s));
  const paymentTypeLabel = getPaymentKindLabel(payment, t);
  const normalizedLang = String(currentLang || 'en').toLowerCase().startsWith('ar') ? 'ar' : 'en';

  const handleDownload = async () => {
    if (downloading) return;

    const idNum = Number(payment?.id);
    if (!Number.isFinite(idNum) || idNum <= 0) {
      toast?.show?.({ type: 'error', message: t('payment.receipt.downloadFailed') });
      return;
    }

    setDownloading(true);
    try {
      const res = await actions.printInvoice({
        id: idNum,
        language: normalizedLang,
        player_name: payment?.playerName || '',
      });

      if (!res?.success) throw new Error('invoice_download_failed');

      const fileUri = await saveReceiptFile({
        payload: res?.data,
        invoiceId: payment?.invoiceId || String(idNum),
      });

      if (fileUri && (await Sharing.isAvailableAsync())) {
        await Sharing.shareAsync(fileUri);
      }

      toast?.show?.({ type: 'success', message: t('payment.receipt.downloadSuccess') });
    } catch {
      toast?.show?.({ type: 'error', message: t('payment.receipt.downloadFailed') });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <PortalAccessGate titleOverride={t('portal.payments.detailTitle')}>
      <AppScreen safe scroll>
        <AppHeader title={t('portal.payments.detailTitle')} onBackPress={goBack} />

        <PortalInfoAccordion
          title={t('portal.payments.detailInfo.title')}
          summary={getGlossaryHelp('paymentStatus')}
          bullets={[
            t('portal.payments.detailInfo.bullet1'),
            t('portal.payments.detailInfo.bullet2'),
            t('portal.payments.detailInfo.bullet3'),
          ]}
        />

        {isUnpaid ? <PortalActionBanner title={t('portal.common.actionRequired')} description={t('portal.payments.resolveBefore', { date: payment?.dueDate || t('portal.common.placeholder') })} actionLabel={t('portal.payments.actionBannerLabel')} onAction={handleDownload} /> : null}

        <Card style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <PortalSection title={paymentTypeLabel} subtitle={t('portal.payments.statusNextStep')} />
          <PortalStatusBadge label={statusMeta.label} severity={statusMeta.severity} />
          <PortalTimeline steps={[t('portal.common.timeline.created'), t('portal.common.timeline.pending'), t('portal.common.timeline.approved'), t('portal.common.timeline.completed')]} activeIndex={stepIndexForStatus(payment?.status)} />
          <View style={styles.row}><Text variant="caption" color={colors.textMuted}>{t('portal.payments.amountLabel')}</Text><Text variant="body" weight="bold" color={colors.textPrimary}>{payment?.amount || 0}</Text></View>
          <View style={styles.row}><Text variant="caption" color={colors.textMuted}>{t('portal.payments.dueLabel')}</Text><Text variant="bodySmall" color={colors.textPrimary}>{payment?.dueDate || t('portal.common.placeholder')}</Text></View>
          <View style={styles.row}><Text variant="caption" color={colors.textMuted}>{t('portal.payments.paidOnLabel')}</Text><Text variant="bodySmall" color={colors.textPrimary}>{payment?.paidOn || t('portal.common.placeholder')}</Text></View>
          <View style={styles.row}><Text variant="caption" color={colors.textMuted}>{t('portal.payments.invoiceLabel')}</Text><Text variant="bodySmall" color={colors.textPrimary}>{payment?.invoiceId || t('portal.common.placeholder')}</Text></View>
        </Card>

        <Card style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text variant="body" weight="bold" color={colors.textPrimary}>{t('portal.payments.whatYouCanDoTitle')}</Text>
          <Text variant="caption" color={colors.textSecondary}>{isUnpaid ? t('portal.payments.whatYouCanDoUnpaid') : t('portal.payments.whatYouCanDoPaid')}</Text>
          {payment?.invoiceId ? (
            <Button onPress={handleDownload} disabled={downloading}>
              <Text variant="caption" weight="bold" color={colors.white}>{downloading ? t('portal.payments.invoiceDownloading') : t('portal.payments.invoiceDownload')}</Text>
            </Button>
          ) : null}
        </Card>
      </AppScreen>
    </PortalAccessGate>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: 1, padding: spacing.lg, marginBottom: spacing.lg, gap: spacing.sm },
  row: { gap: 4 },
});
