import { endpoints } from './endpoints';

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
    academy: data?.academy || null,
    template_sections: data?.template_sections || {},
    courses: Array.isArray(data?.courses) ? data.courses : [],
    media_by_type: data?.media_by_type || {},
    success_story: data?.success_story || null,
  };
};

const buildListPayload = ({ filters = {}, query = '', page = 1, pageSize = DEFAULT_PAGE_SIZE, coords } = {}) => {
  const age = filters?.age;
  const normalizedAge = age === null || age === undefined || age === '' ? undefined : Number(age);
  const payload = {
    q: query || '',
    age: Number.isFinite(normalizedAge) ? normalizedAge : undefined,
    registration_enabled: filters.registrationEnabled ? true : undefined,
    is_pro: filters.proOnly ? true : undefined,
    sort: filters.sort || 'recommended',
    page,
    page_size: pageSize,
  };

  if (filters.sort === 'nearest' && coords?.lat && coords?.lng) {
    payload.lat = coords.lat;
    payload.lng = coords.lng;
  }

  return payload;
};

const buildMapPayload = ({ filters = {}, query = '', coords } = {}) => {
  const age = filters?.age;
  const normalizedAge = age === null || age === undefined || age === '' ? undefined : Number(age);
  const payload = {
    q: query || '',
    age: Number.isFinite(normalizedAge) ? normalizedAge : undefined,
    registration_enabled: filters.registrationEnabled ? true : undefined,
    is_pro: filters.proOnly ? true : undefined,
    sort: filters.sort || 'recommended',
  };

  if (filters.sort === 'nearest' && coords?.lat && coords?.lng) {
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
  async listAcademies({ filters, query, page, pageSize, coords } = {}) {
    try {
      const payload = buildListPayload({ filters, query, page, pageSize, coords });
      const res = await endpoints.publicAcademies.list(payload);
      return normalizeListResponse(res);
    } catch (error) {
      throw normalizeError(error);
    }
  },
  async listMapAcademies({ filters, query, coords } = {}) {
    try {
      const payload = buildMapPayload({ filters, query, coords });
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
  async listActivities({ filters, query, coords } = {}) {
    const res = await academyDiscoveryApi.listAcademies({
      filters,
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
  async listCities({ filters, query, coords } = {}) {
    const res = await academyDiscoveryApi.listAcademies({
      filters,
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
  supportsDistance: false,
  supportsRating: false,
  supportsPriceRange: false,
  supportsOpenRegistration: true,
  supportsSort: true,
  supportsAge: true,
};

export const ACADEMY_DISCOVERY_PAGE_SIZE = DEFAULT_PAGE_SIZE;
