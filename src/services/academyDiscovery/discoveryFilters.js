const toNumberOrNull = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const normalizeText = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const normalizeUniqueArray = (value) => {
  if (!Array.isArray(value)) return [];
  const out = [];
  value.forEach((entry) => {
    const text = String(entry || '').trim();
    if (text && !out.includes(text)) out.push(text);
  });
  return out;
};

const rangesOverlap = (aFrom, aTo, bFrom, bTo) => aFrom <= bTo && aTo >= bFrom;

export const DISCOVERY_COMPARE_LIMIT = 3;

export const DISCOVERY_SORT_VALUES = ['recommended', 'newest', 'nearest'];
export const DEFAULT_DISCOVERY_SORT = 'recommended';

export const FILTER_LIMITS = {
  age: { min: 6, max: 18, step: 1 },
  fee: { min: 0, max: 200, step: 5 },
};

export const DISTANCE_FILTER_OPTIONS = [1, 5, 10, 25];

export const AGE_PRESET_OPTIONS = [
  { key: '6-8', min: 6, max: 8 },
  { key: '9-12', min: 9, max: 12 },
  { key: '13-18', min: 13, max: 18 },
];

export const SPORT_FILTER_OPTIONS = [
  {
    key: 'football',
    apiValue: 'Football',
    labelKey: 'sports.football',
    aliases: ['football', 'soccer', 'foot ball', 'futbol'],
  },
  {
    key: 'swimming',
    apiValue: 'Swimming',
    labelKey: 'sports.swimming',
    aliases: ['swimming', 'swim'],
  },
  {
    key: 'basketball',
    apiValue: 'Basketball',
    labelKey: 'sports.basketball',
    aliases: ['basketball', 'basket ball'],
  },
  {
    key: 'tennis',
    apiValue: 'Tennis',
    labelKey: 'sports.tennis',
    aliases: ['tennis', 'tenis'],
  },
  {
    key: 'martialArts',
    apiValue: 'Martial Arts',
    labelKey: 'sports.martialArts',
    aliases: ['martial arts', 'martial', 'karate', 'taekwondo', 'judo', 'mma'],
  },
  {
    key: 'volleyball',
    apiValue: 'Volleyball',
    labelKey: 'sports.volleyball',
    aliases: ['volleyball', 'volley ball'],
  },
  {
    key: 'kens',
    apiValue: 'Kens',
    labelKey: 'sports.kens',
    aliases: ['kens'],
  },
];

const SPORT_ALIAS_TO_KEY = SPORT_FILTER_OPTIONS.reduce((acc, option) => {
  acc[normalizeText(option.key)] = option.key;
  (option.aliases || []).forEach((alias) => {
    acc[normalizeText(alias)] = option.key;
  });
  return acc;
}, {});

const normalizeSportKey = (value) => {
  const normalized = normalizeText(value);
  if (!normalized) return null;
  return SPORT_ALIAS_TO_KEY[normalized] || null;
};

const normalizeSports = (value) => {
  const list = normalizeUniqueArray(value)
    .map((entry) => normalizeSportKey(entry))
    .filter(Boolean);
  return normalizeUniqueArray(list);
};

const normalizeRange = (fromValue, toValue, minLimit, maxLimit) => {
  const rawFrom = toNumberOrNull(fromValue);
  const rawTo = toNumberOrNull(toValue);

  const safeFrom = clamp(rawFrom ?? minLimit, minLimit, maxLimit);
  const safeTo = clamp(rawTo ?? maxLimit, minLimit, maxLimit);

  return {
    from: Math.min(safeFrom, safeTo),
    to: Math.max(safeFrom, safeTo),
  };
};

const normalizeDistance = (value) => {
  const numeric = toNumberOrNull(value);
  if (!numeric) return null;
  return DISTANCE_FILTER_OPTIONS.includes(numeric) ? numeric : null;
};

export const DISCOVERY_FILTER_SCHEMA = {
  ageMin: FILTER_LIMITS.age.min,
  ageMax: FILTER_LIMITS.age.max,
  sports: [],
  registrationOpen: false,
  feeMin: FILTER_LIMITS.fee.min,
  feeMax: FILTER_LIMITS.fee.max,
  distanceKm: null,
};

export const DEFAULT_DISCOVERY_FILTERS = { ...DISCOVERY_FILTER_SCHEMA };

export const normalizeDiscoverySort = (sort) => {
  const value = String(sort || '').trim();
  return DISCOVERY_SORT_VALUES.includes(value) ? value : DEFAULT_DISCOVERY_SORT;
};

export const normalizeDiscoveryFilters = (filters = {}) => {
  const legacyAge = toNumberOrNull(filters.age);
  const ageRange = normalizeRange(
    filters.ageMin ?? legacyAge,
    filters.ageMax ?? legacyAge,
    FILTER_LIMITS.age.min,
    FILTER_LIMITS.age.max
  );

  const feeRange = normalizeRange(
    filters.feeMin,
    filters.feeMax,
    FILTER_LIMITS.fee.min,
    FILTER_LIMITS.fee.max
  );

  return {
    ageMin: ageRange.from,
    ageMax: ageRange.to,
    sports: normalizeSports(filters.sports),
    registrationOpen: !!(filters.registrationOpen ?? filters.registrationEnabled),
    feeMin: feeRange.from,
    feeMax: feeRange.to,
    distanceKm: normalizeDistance(filters.distanceKm),
  };
};

export const normalizeDiscoveryAcademy = (item) => item?.academy || item || null;

const getAcademyAgeRanges = (item) => {
  const academy = normalizeDiscoveryAcademy(item);
  if (!academy) return [];

  const ranges = [];
  const academyFrom = toNumberOrNull(academy?.ages_from ?? academy?.age_from);
  const academyTo = toNumberOrNull(academy?.ages_to ?? academy?.age_to);

  if (academyFrom != null || academyTo != null) {
    const from = academyFrom ?? academyTo;
    const to = academyTo ?? academyFrom;
    if (from != null && to != null) {
      ranges.push({
        from: clamp(Math.min(from, to), FILTER_LIMITS.age.min, FILTER_LIMITS.age.max),
        to: clamp(Math.max(from, to), FILTER_LIMITS.age.min, FILTER_LIMITS.age.max),
      });
    }
  }

  const courses = Array.isArray(item?.courses)
    ? item.courses
    : Array.isArray(academy?.courses)
      ? academy.courses
      : [];

  courses.forEach((course) => {
    const cFrom = toNumberOrNull(course?.age_from ?? course?.ages_from);
    const cTo = toNumberOrNull(course?.age_to ?? course?.ages_to);
    if (cFrom == null && cTo == null) return;

    const from = cFrom ?? cTo;
    const to = cTo ?? cFrom;

    if (from != null && to != null) {
      ranges.push({
        from: clamp(Math.min(from, to), FILTER_LIMITS.age.min, FILTER_LIMITS.age.max),
        to: clamp(Math.max(from, to), FILTER_LIMITS.age.min, FILTER_LIMITS.age.max),
      });
    }
  });

  return ranges;
};

const getAcademySports = (item) => {
  const academy = normalizeDiscoveryAcademy(item);
  if (!academy) return [];
  const rawSports = Array.isArray(academy?.sport_types) ? academy.sport_types : [];
  return normalizeSports(rawSports);
};

const getAcademyDistanceKm = (item) => {
  const academy = normalizeDiscoveryAcademy(item);
  const value = toNumberOrNull(item?.distance_km ?? item?.distanceKm ?? academy?.distance_km);
  return value != null && value >= 0 ? value : null;
};

const getAcademyFeeAmount = (item) => {
  const academy = normalizeDiscoveryAcademy(item);
  return toNumberOrNull(academy?.subscription_fee_amount);
};

const isRegistrationOpen = (item) => {
  const academy = normalizeDiscoveryAcademy(item);
  if (!academy) return false;
  return !!academy?.registration_enabled || !!academy?.registration_open;
};

const matchesQuery = (item, normalizedQuery) => {
  if (!normalizedQuery) return true;
  const academy = normalizeDiscoveryAcademy(item);
  const candidates = [
    academy?.name_en,
    academy?.name_ar,
    academy?.name,
    academy?.city,
    academy?.location,
    academy?.country,
    academy?.address,
  ];
  return candidates.some((value) => normalizeText(value).includes(normalizedQuery));
};

const matchesAge = (item, ageMin, ageMax) => {
  if (ageMin === FILTER_LIMITS.age.min && ageMax === FILTER_LIMITS.age.max) return true;

  const ranges = getAcademyAgeRanges(item);
  if (!ranges.length) return false;

  return ranges.some((range) => rangesOverlap(range.from, range.to, ageMin, ageMax));
};

const matchesSports = (item, selectedSports) => {
  if (!selectedSports.length) return true;

  const academySports = getAcademySports(item);
  if (!academySports.length) return false;

  return selectedSports.some((selectedSport) => academySports.includes(selectedSport));
};

const matchesRegistration = (item, registrationOpen) => {
  if (!registrationOpen) return true;
  return isRegistrationOpen(item);
};

const matchesFee = (item, feeMin, feeMax) => {
  if (feeMin === FILTER_LIMITS.fee.min && feeMax === FILTER_LIMITS.fee.max) return true;

  const fee = getAcademyFeeAmount(item);
  if (fee == null) return false;

  return fee >= feeMin && fee <= feeMax;
};

const matchesDistance = (item, distanceKm) => {
  if (distanceKm == null) return true;

  const distance = getAcademyDistanceKm(item);
  if (distance == null) return false;

  return distance <= distanceKm;
};

const sortDiscoveryItems = (items, sort) => {
  const list = Array.isArray(items) ? [...items] : [];

  if (sort === 'nearest') {
    return list.sort((a, b) => {
      const aDistance = getAcademyDistanceKm(a);
      const bDistance = getAcademyDistanceKm(b);
      const aVal = aDistance == null ? Number.MAX_SAFE_INTEGER : aDistance;
      const bVal = bDistance == null ? Number.MAX_SAFE_INTEGER : bDistance;
      return aVal - bVal;
    });
  }

  if (sort === 'newest') {
    return list.sort((a, b) => {
      const academyA = normalizeDiscoveryAcademy(a);
      const academyB = normalizeDiscoveryAcademy(b);

      const aTime = Date.parse(academyA?.created_at || academyA?.createdAt || 0) || 0;
      const bTime = Date.parse(academyB?.created_at || academyB?.createdAt || 0) || 0;
      if (aTime !== bTime) return bTime - aTime;

      const aId = toNumberOrNull(academyA?.id) || 0;
      const bId = toNumberOrNull(academyB?.id) || 0;
      return bId - aId;
    });
  }

  return list;
};

export const applyDiscoveryFilters = (items, { query, filters, sort } = {}) => {
  const normalizedFilters = normalizeDiscoveryFilters(filters);
  const normalizedQuery = normalizeText(query || '');
  const normalizedSort = normalizeDiscoverySort(sort);

  const filtered = (Array.isArray(items) ? items : []).filter(
    (item) =>
      matchesQuery(item, normalizedQuery) &&
      matchesAge(item, normalizedFilters.ageMin, normalizedFilters.ageMax) &&
      matchesSports(item, normalizedFilters.sports) &&
      matchesRegistration(item, normalizedFilters.registrationOpen) &&
      matchesFee(item, normalizedFilters.feeMin, normalizedFilters.feeMax) &&
      matchesDistance(item, normalizedFilters.distanceKm)
  );

  return sortDiscoveryItems(filtered, normalizedSort);
};

export const getDiscoveryOptionsFromAcademies = (items = []) => {
  const dynamicSports = new Set();

  (Array.isArray(items) ? items : []).forEach((item) => {
    getAcademySports(item).forEach((sport) => dynamicSports.add(sport));
  });

  const schemaSports = SPORT_FILTER_OPTIONS.map((item) => item.key);
  const sports = Array.from(new Set([...schemaSports, ...Array.from(dynamicSports)]));

  return {
    sports,
    cities: [],
  };
};

const formatCurrency = (value, locale) => {
  const numeric = toNumberOrNull(value);
  if (numeric == null) return String(value);
  try {
    return new Intl.NumberFormat(locale || 'en', {
      style: 'currency',
      currency: 'JOD',
      maximumFractionDigits: 0,
    }).format(numeric);
  } catch {
    return `${numeric} JOD`;
  }
};

const isDefaultAgeRange = (filters) =>
  filters.ageMin === FILTER_LIMITS.age.min && filters.ageMax === FILTER_LIMITS.age.max;

const isDefaultFeeRange = (filters) =>
  filters.feeMin === FILTER_LIMITS.fee.min && filters.feeMax === FILTER_LIMITS.fee.max;

export const buildAppliedDiscoveryChips = ({ t, query, filters, sort, language }) => {
  const normalized = normalizeDiscoveryFilters(filters);
  const normalizedSort = normalizeDiscoverySort(sort);
  const chips = [];

  if (query) {
    chips.push({
      key: 'query',
      label: query,
      category: 'query',
    });
  }

  if (!isDefaultAgeRange(normalized)) {
    chips.push({
      key: 'age',
      label: `${t('filters.ageRange')}: ${normalized.ageMin}-${normalized.ageMax}`,
      category: 'filter',
    });
  }

  normalized.sports.forEach((sportKey) => {
    chips.push({
      key: `sport:${sportKey}`,
      label: `${t('filters.sport')}: ${t(`sports.${sportKey}`)}`,
      category: 'filter',
    });
  });

  if (normalized.registrationOpen) {
    chips.push({
      key: 'registrationOpen',
      label: t('filters.onlyOpenRegistration'),
      category: 'filter',
    });
  }

  if (!isDefaultFeeRange(normalized)) {
    chips.push({
      key: 'fee',
      label: `${t('filters.monthlyFee')}: ${formatCurrency(normalized.feeMin, language)} - ${formatCurrency(normalized.feeMax, language)}`,
      category: 'filter',
    });
  }

  if (normalized.distanceKm != null) {
    chips.push({
      key: 'distanceKm',
      label: `${t('filters.distance')}: ${t(`distance.${normalized.distanceKm}km`)}`,
      category: 'filter',
    });
  }

  if (normalizedSort !== DEFAULT_DISCOVERY_SORT) {
    chips.push({
      key: 'sort',
      label: t(`service.academy.discovery.sort.${normalizedSort}`),
      category: 'sort',
    });
  }

  return chips;
};

export const removeDiscoveryChip = ({ chipKey, filters, query, sort }) => {
  const nextFilters = normalizeDiscoveryFilters(filters);
  let nextQuery = query || '';
  let nextSort = normalizeDiscoverySort(sort);

  if (chipKey === 'query') {
    nextQuery = '';
  } else if (chipKey === 'age') {
    nextFilters.ageMin = FILTER_LIMITS.age.min;
    nextFilters.ageMax = FILTER_LIMITS.age.max;
  } else if (chipKey === 'registrationOpen') {
    nextFilters.registrationOpen = false;
  } else if (chipKey === 'fee') {
    nextFilters.feeMin = FILTER_LIMITS.fee.min;
    nextFilters.feeMax = FILTER_LIMITS.fee.max;
  } else if (chipKey === 'distanceKm') {
    nextFilters.distanceKm = null;
  } else if (chipKey === 'sort') {
    nextSort = DEFAULT_DISCOVERY_SORT;
  } else if (chipKey.startsWith('sport:')) {
    const sportKey = chipKey.slice('sport:'.length);
    nextFilters.sports = nextFilters.sports.filter((entry) => entry !== sportKey);
  }

  return {
    nextFilters: normalizeDiscoveryFilters(nextFilters),
    nextQuery,
    nextSort,
  };
};

export const getPrimaryApiSport = (sports = []) => {
  const normalized = normalizeSports(sports);
  if (!normalized.length) return undefined;

  const first = normalized[0];
  const option = SPORT_FILTER_OPTIONS.find((entry) => entry.key === first);
  return option?.apiValue || undefined;
};

export const hasActiveDiscoveryFilters = (filters = {}) => {
  const normalized = normalizeDiscoveryFilters(filters);
  return (
    !isDefaultAgeRange(normalized) ||
    normalized.sports.length > 0 ||
    normalized.registrationOpen ||
    !isDefaultFeeRange(normalized) ||
    normalized.distanceKm != null
  );
};

