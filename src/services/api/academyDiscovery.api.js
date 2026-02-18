import { endpoints } from './endpoints';
import {
  FILTER_LIMITS,
  getPrimaryApiSport,
  normalizeDiscoveryFilters,
  normalizeDiscoverySort,
} from '../academyDiscovery/discoveryFilters';

const DEFAULT_PAGE_SIZE = 10;

const normalizeListResponse = (res) => {
  const raw = res?.data ?? res;
  const items =
    (Array.isArray(raw) && raw) ||
    (Array.isArray(raw?.data) && raw.data) ||
    (Array.isArray(raw?.results) && raw.results) ||
    (Array.isArray(raw?.items) && raw.items) ||
    (Array.isArray(res?.items) && res.items) ||
    [];
  const meta = raw?.meta || raw?.pagination || res?.meta || res?.pagination || {};
  return { items, meta };
};

const normalizeTemplateResponse = (res) => {
  const data = res?.data || res || null;
  if (!data) return null;
  return {
    ...data,
    academy: data?.academy || null,
    template_sections: data?.template_sections || {},
    courses: Array.isArray(data?.courses) ? data.courses : [],
    media_by_type: data?.media_by_type || {},
    success_story: data?.success_story || null,
    reviews: Array.isArray(data?.reviews) ? data.reviews : [],
    academy_reviews: Array.isArray(data?.academy_reviews) ? data.academy_reviews : [],
    similar_academies: Array.isArray(data?.similar_academies) ? data.similar_academies : [],
    facilities: Array.isArray(data?.facilities) ? data.facilities : [],
  };
};

const pickAgeQueryValue = (filters) => {
  const ageMin = Number(filters?.ageMin);
  const ageMax = Number(filters?.ageMax);
  if (!Number.isFinite(ageMin) || !Number.isFinite(ageMax)) return undefined;

  if (ageMin === FILTER_LIMITS.age.min && ageMax === FILTER_LIMITS.age.max) return undefined;
  return Math.round((ageMin + ageMax) / 2);
};

const buildListPayload = ({
  filters = {},
  sort,
  query = '',
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  coords,
} = {}) => {
  const normalizedFilters = normalizeDiscoveryFilters(filters);
  const normalizedSort = normalizeDiscoverySort(sort);

  const payload = {
    q: query || '',
    age: pickAgeQueryValue(normalizedFilters),
    registration_enabled: normalizedFilters.registrationOpen ? true : undefined,
    sort: normalizedSort,
    sport: getPrimaryApiSport(normalizedFilters.sports),
    page,
    page_size: pageSize,
  };

  if (normalizedSort === 'nearest' && coords?.lat && coords?.lng) {
    payload.lat = coords.lat;
    payload.lng = coords.lng;
  }

  return payload;
};

const buildMapPayload = ({ filters = {}, sort, query = '', coords } = {}) => {
  const normalizedFilters = normalizeDiscoveryFilters(filters);
  const normalizedSort = normalizeDiscoverySort(sort);

  const payload = {
    q: query || '',
    age: pickAgeQueryValue(normalizedFilters),
    registration_enabled: normalizedFilters.registrationOpen ? true : undefined,
    sort: normalizedSort,
    sport: getPrimaryApiSport(normalizedFilters.sports),
  };

  if (normalizedSort === 'nearest' && coords?.lat && coords?.lng) {
    payload.lat = coords.lat;
    payload.lng = coords.lng;
  }

  return payload;
};

const normalizeError = (error) => {
  if (!error) return new Error('Unknown error');
  if (error instanceof Error) return error;
  const message = error?.message || 'Unknown error';
  return new Error(message);
};

export const academyDiscoveryApi = {
  async listAcademies({ filters, sort, query, page, pageSize, coords } = {}) {
    try {
      const payload = buildListPayload({ filters, sort, query, page, pageSize, coords });
      const res = await endpoints.publicAcademies.list(payload);
      return normalizeListResponse(res);
    } catch (error) {
      throw normalizeError(error);
    }
  },
  async listMapAcademies({ filters, sort, query, coords } = {}) {
    try {
      const payload = buildMapPayload({ filters, sort, query, coords });
      const res = await endpoints.publicAcademies.map(payload);
      return normalizeListResponse(res);
    } catch (error) {
      throw normalizeError(error);
    }
  },
  async getAcademyDetails(slug) {
    if (!slug) throw new Error('Missing academy slug');
    try {
      const res = await endpoints.publicAcademies.getTemplate(slug);
      return normalizeTemplateResponse(res);
    } catch (error) {
      throw normalizeError(error);
    }
  },
  async listActivities({ filters, sort, query, coords } = {}) {
    const res = await academyDiscoveryApi.listAcademies({
      filters,
      sort,
      query,
      page: 1,
      pageSize: 50,
      coords,
    });
    const set = new Set();
    res.items.forEach((item) => {
      const academy = item?.academy || item;
      const sports = Array.isArray(academy?.sport_types) ? academy.sport_types : [];
      sports.forEach((sport) => {
        if (sport) set.add(sport);
      });
    });
    return Array.from(set);
  },
  async listCities({ filters, sort, query, coords } = {}) {
    const res = await academyDiscoveryApi.listAcademies({
      filters,
      sort,
      query,
      page: 1,
      pageSize: 50,
      coords,
    });
    const set = new Set();
    res.items.forEach((item) => {
      const academy = item?.academy || item;
      const city = academy?.city || academy?.location || '';
      if (city) set.add(city);
    });
    return Array.from(set);
  },
};

export const academyDiscoveryFilters = {
  supportsDistance: true,
  supportsRating: false,
  supportsPriceRange: true,
  supportsOpenRegistration: true,
  supportsSort: true,
  supportsAge: true,
  supportsSports: true,
  supportsCities: false,
};

export const ACADEMY_DISCOVERY_PAGE_SIZE = DEFAULT_PAGE_SIZE;

