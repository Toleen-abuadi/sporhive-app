// src/screens/playgrounds/bookingWizard.utils.js

export const normalizeRouterParam = (raw) => {
  if (Array.isArray(raw)) return raw[0];
  return raw ?? null;
};

export const formatIsoDate = (date) => date.toISOString().slice(0, 10);

export const buildQuickDates = (count = 7) => {
  return Array.from({ length: count }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return formatIsoDate(d);
  });
};

export const formatSlotLabel = (slot, t) => {
  const start = slot?.start_time || slot?.start || '';
  const end = slot?.end_time || slot?.end || '';
  if (!start && !end) return t('service.playgrounds.common.timeTbd');
  if (!end) return start;
  return `${start} - ${end}`;
};

export const buildDraftPayload = (venueId, state) => {
  if (!venueId) return null;
  return { venueId: String(venueId), draft: state };
};

export const moneyLabel = (amount, currency, t) => {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) {
    return t?.('service.playgrounds.common.placeholder') || '--';
  }
  return `${Number(amount).toFixed(2)} ${currency}`;
};
