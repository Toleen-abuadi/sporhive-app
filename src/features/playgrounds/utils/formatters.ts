import type { ImageSourcePropType } from 'react-native';

const parsePrice = (value: number | string | null | undefined): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const normalized = trimmed.replace(/,/g, '');
    const parsed = Number.parseFloat(normalized);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
};

export const formatJodPrice = (value: number | string | null | undefined) => {
  const parsed = parsePrice(value);
  if (parsed === null) return 'JOD —';
  const formatter = new Intl.NumberFormat('en-JO', {
    minimumFractionDigits: parsed % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return `JOD ${formatter.format(parsed)}`;
};

export const formatTime = (value?: string | null) => {
  if (!value) return '';
  const parts = value.split(':');
  if (parts.length < 2) return value;
  const hours = parts[0].padStart(2, '0');
  const minutes = parts[1].padStart(2, '0');
  return `${hours}:${minutes}`;
};

export const resolveImageSource = (uri?: string | null): ImageSourcePropType | null => {
  if (!uri) return null;
  const trimmed = uri.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('data:image')) {
    return { uri: trimmed };
  }
  return { uri: trimmed };
};
