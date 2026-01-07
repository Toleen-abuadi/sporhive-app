// src/services/portal/portal.validators.js
const isEmpty = (v) => v == null || String(v).trim() === '';

export const validators = {
  required(v, msg = 'Required') {
    return isEmpty(v) ? msg : '';
  },
  phone(v, msg = 'Invalid phone') {
    if (isEmpty(v)) return '';
    const s = String(v).replace(/\s+/g, '');
    // relaxed: +country or local 07..., 8-15 digits
    const ok = /^(\+?\d{8,15})$/.test(s);
    return ok ? '' : msg;
  },
  dateISO(v, msg = 'Invalid date') {
    if (isEmpty(v)) return '';
    return /^\d{4}-\d{2}-\d{2}$/.test(String(v)) ? '' : msg;
  },
  number(v, msg = 'Invalid number') {
    if (isEmpty(v)) return '';
    return Number.isFinite(Number(v)) ? '' : msg;
  },
  url(v, msg = 'Invalid link') {
    if (isEmpty(v)) return '';
    try {
      // eslint-disable-next-line no-new
      new URL(String(v));
      return '';
    } catch {
      return msg;
    }
  },
};

export const validateMap = (values, schema) => {
  const errs = {};
  Object.keys(schema).forEach((k) => {
    const rules = schema[k] || [];
    for (const fn of rules) {
      const e = fn(values[k]);
      if (e) {
        errs[k] = e;
        break;
      }
    }
  });
  return errs;
};
