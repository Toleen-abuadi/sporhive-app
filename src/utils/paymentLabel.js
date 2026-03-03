const normalizeValue = (value) => {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase();
};

export const PAYMENT_SUBTYPE_KEYS = {
  additional_uniform: 'payment.subType.additional_uniform',
  renewal: 'payment.subType.renewal',
  new: 'payment.subType.new',
};

export const PAYMENT_TYPE_KEYS = {
  full: 'payment.type.full',
  installment: 'payment.type.installment',
};

export function getPaymentKindLabel(payment, t) {
  const sub = normalizeValue(payment?.sub_type || payment?.subType);
  if (sub && PAYMENT_SUBTYPE_KEYS[sub]) return t(PAYMENT_SUBTYPE_KEYS[sub]);
  if (sub && !PAYMENT_SUBTYPE_KEYS[sub]) return t('payment.type.unknown');

  const type = normalizeValue(payment?.type);
  if (type && PAYMENT_TYPE_KEYS[type]) return t(PAYMENT_TYPE_KEYS[type]);

  return t('payment.type.unknown');
}

// Backward-compatible alias for existing imports.
export const getPaymentTypeLabel = getPaymentKindLabel;
