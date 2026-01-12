import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { portalApi } from './portal.api';
import { portalStore, usePortalAuth } from './portal.store';

export function usePortalOverview() {
  const [state, setState] = useState(portalStore.getState());
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const unsub = portalStore.subscribe((next) => {
      if (mounted.current) setState(next);
    });

    if (!portalStore.getState().overview && !portalStore.getState().loading) {
      portalStore.loadOverview();
    }

    return () => {
      mounted.current = false;
      unsub?.();
    };
  }, []);

  const refresh = useCallback(async () => portalStore.refreshOverview(), []);

  return { ...state, refresh };
}

export function usePortal() {
  return usePortalOverview();
}

export function usePortalAuthState() {
  return usePortalAuth();
}

export function usePortalRefresh() {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await portalStore.refreshOverview();
    } finally {
      setRefreshing(false);
    }
  }, []);

  return { refreshing, onRefresh };
}

export function usePortalProfile() {
  const { updateProfile, getProfile, isLoading, error } = usePortalAuth();

  const fetchProfile = useCallback(async () => getProfile(), [getProfile]);

  return {
    fetchProfile,
    updateProfile,
    isLoading,
    error,
  };
}

export function usePortalRenewals() {
  const { submitRenewal, isLoading, error } = usePortalAuth();

  const checkEligibility = useCallback(async (payload = {}) => portalApi.renewalsEligibility(payload), []);

  return {
    checkEligibility,
    submitRenewal,
    isLoading,
    error,
  };
}

export function usePortalFreezes() {
  const { submitFreeze, isLoading, error } = usePortalAuth();

  const listFreezes = useCallback(async (payload = {}) => portalApi.listFreezes(payload), []);

  return {
    listFreezes,
    submitFreeze,
    isLoading,
    error,
  };
}

export function usePortalPayments() {
  const [loading, setLoading] = useState(false);
  const [payments, setPayments] = useState([]);
  const [error, setError] = useState(null);

  const loadPayments = useCallback(async (payload = {}) => {
    try {
      setLoading(true);
      setError(null);
      const res = await portalApi.listPayments(payload);
      if (!res?.success) throw res?.error || new Error('Failed to load payments');
      const items = res.data?.payments || res.data?.data || res.data || [];
      setPayments(Array.isArray(items) ? items : []);
      return res;
    } catch (err) {
      setError(err);
      setPayments([]);
      return { success: false, error: err };
    } finally {
      setLoading(false);
    }
  }, []);

  return { payments, loadPayments, loading, error };
}

export function usePortalRatings() {
  const [loading, setLoading] = useState(false);
  const [types, setTypes] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);

  const loadRatings = useCallback(async (payload = {}) => {
    try {
      setLoading(true);
      setError(null);
      const [typesRes, periodsRes, summaryRes] = await Promise.all([
        portalApi.listRatingTypes(payload),
        portalApi.listRatingPeriods(payload),
        portalApi.fetchRatingSummary(payload),
      ]);

      if (typesRes?.success) setTypes(typesRes.data?.types || typesRes.data || []);
      if (periodsRes?.success) setPeriods(periodsRes.data?.periods || periodsRes.data || []);
      if (summaryRes?.success) setSummary(summaryRes.data || null);

      return { typesRes, periodsRes, summaryRes };
    } catch (err) {
      setError(err);
      return { success: false, error: err };
    } finally {
      setLoading(false);
    }
  }, []);

  return { types, periods, summary, loadRatings, loading, error };
}

export function usePortalStorefront() {
  const [loading, setLoading] = useState(false);
  const [storeItems, setStoreItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState(null);

  const loadStorefront = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [storeRes, ordersRes] = await Promise.all([
        portalApi.listUniformStore(),
        portalApi.listMyUniformOrders({}),
      ]);

      if (storeRes?.success) setStoreItems(storeRes.data?.items || storeRes.data || []);
      if (ordersRes?.success) setOrders(ordersRes.data?.orders || ordersRes.data || []);

      return { storeRes, ordersRes };
    } catch (err) {
      setError(err);
      return { success: false, error: err };
    } finally {
      setLoading(false);
    }
  }, []);

  return { storeItems, orders, loadStorefront, loading, error };
}

export function usePortalNews() {
  const [loading, setLoading] = useState(false);
  const [news, setNews] = useState([]);
  const [error, setError] = useState(null);

  const loadNews = useCallback(async (payload = {}) => {
    try {
      setLoading(true);
      setError(null);
      const res = await portalApi.listNews(payload);
      if (!res?.success) throw res?.error || new Error('Failed to load news');
      const items = res.data?.news || res.data?.items || res.data || [];
      setNews(Array.isArray(items) ? items : []);
      return res;
    } catch (err) {
      setError(err);
      setNews([]);
      return { success: false, error: err };
    } finally {
      setLoading(false);
    }
  }, []);

  return { news, loadNews, loading, error };
}

export function useAcademies() {
  const mounted = useRef(true);

  const [loading, setLoading] = useState(true);
  const [academies, setAcademies] = useState([]);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await portalApi.fetchActiveAcademies();
      if (!res?.success) throw res?.error || new Error('Failed');

      const raw = res.data || {};
      const customers = Array.isArray(raw.customers)
        ? raw.customers
        : Array.isArray(raw?.data?.customers)
          ? raw.data.customers
          : [];

      const items = customers.map((c) => {
        const academy_name = c.academy_name || '';
        const client_name = c.client_name || '';
        const label = c.label || `${academy_name} — ${client_name}`.trim();

        return {
          id: Number(c.id),
          academy_name,
          client_name,
          label,
          name: academy_name || label || 'Academy',
          subtitle: client_name || '',
          searchText: `${academy_name} ${client_name} ${label}`.toLowerCase(),
        };
      });

      if (mounted.current) setAcademies(items);
      return items;
    } catch (e) {
      if (mounted.current) {
        setError(e);
        setAcademies([]);
      }
      return [];
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    load();
    return () => {
      mounted.current = false;
    };
  }, [load]);

  const filtered = useMemo(() => {
    const q = (searchQuery || '').trim().toLowerCase();
    if (!q) return academies;
    return academies.filter((a) => (a.searchText || '').includes(q));
  }, [academies, searchQuery]);

  return {
    academies: filtered,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    refresh: load,
  };
}
