import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { portalApi } from '../api/playerPortalApi';
import { portalStore } from './portal.store';
import { normalizeUniformOrders } from './portal.normalize';
import { useAuth } from '../auth/auth.store';
import { validatePortalSession } from '../auth/portalSession';

export function usePortalOverview() {
  const [state, setState] = useState(portalStore.getState());
  const mounted = useRef(true);
  const { session, isLoading: authLoading } = useAuth();

  useEffect(() => {
    mounted.current = true;
    const unsub = portalStore.subscribe((next) => {
      if (mounted.current) setState(next);
    });

    const isSessionValid = !authLoading && validatePortalSession(session).ok;
    if (!portalStore.getState().overview && !portalStore.getState().loading && isSessionValid) {
      portalStore.loadOverview();
    }

    return () => {
      mounted.current = false;
      unsub?.();
    };
  }, [authLoading, session]);

  const refresh = useCallback(async () => portalStore.refreshOverview(), []);

  return { ...state, refresh };
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

export function usePortalRenewals() {
  const [eligibility, setEligibility] = useState(null);
  const [loading, setLoading] = useState(false);

  const checkEligibility = useCallback(async () => {
    setLoading(true);
    const res = await portalApi.renewalsEligibility();
    if (res?.success) setEligibility(res.data?.data || res.data);
    setLoading(false);
    return res;
  }, []);

  const requestRenewal = useCallback(async () => {
    setLoading(true);
    const res = await portalApi.renewalsRequest();
    setLoading(false);
    return res;
  }, []);

  return {
    eligibility,
    loading,
    checkEligibility,
    submitRenewal: requestRenewal,
  };
}

export function usePortalFreezes() {
  const [freezes, setFreezes] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadFreezes = useCallback(async () => {
    setLoading(true);
    const res = await portalApi.requestFreeze({ preview: true });
    if (res?.success) setFreezes(res.data?.data || res.data || []);
    setLoading(false);
    return res;
  }, []);

  const handleSubmit = useCallback(async () => {
    setLoading(true);
    const res = await portalApi.requestFreeze();
    setLoading(false);
    return res;
  }, []);

  useEffect(() => {
    loadFreezes();
  }, [loadFreezes]);

  return { freezes, loading, refresh: loadFreezes, submitFreeze: handleSubmit };
}

export function usePortalPayments() {
  const { overview, loading, error, refresh } = usePortalOverview();
  const [invoiceLoading, setInvoiceLoading] = useState(false);

  const payments = useMemo(() => {
    return overview?.payments || [];
  }, [overview]);

  const printInvoice = useCallback(async (payload) => {
    setInvoiceLoading(true);
    const res = await portalApi.printInvoice(payload);
    setInvoiceLoading(false);
    return res;
  }, []);

  return { 
    payments, 
    loading, 
    error, 
    reload: refresh, 
    printInvoice,
    invoiceLoading 
  };
}

export function usePortalPerformance() {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    const load = async () => {
      const res = await portalApi.getRatingSummary();
      if (res?.success) setSummary(res.data?.summary || res.data?.data || res.data);
    };
    load();
  }, []);

  return { summary };
}

export function usePortalUniforms() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const load = async () => {
      const res = await portalApi.listUniformStore();
      if (res?.success) setItems(res.data?.data || res.data || []);
    };
    load();
  }, []);

  return { items };
}

export function usePortalOrders() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const load = async () => {
      const res = await portalApi.listMyUniformOrders();
      if (res?.success) setOrders(normalizeUniformOrders(res.data));
    };
    load();
  }, []);

  return { orders };
}

export function usePortalNews() {
  const [news, setNews] = useState([]);

  useEffect(() => {
    const load = async () => {
      const res = await portalApi.listNews();
      if (res?.success) {
        const raw = res.data;
        const list =
          Array.isArray(raw) ? raw :
            Array.isArray(raw?.news) ? raw.news :
              Array.isArray(raw?.data?.news) ? raw.data.news :
                Array.isArray(raw?.data) ? raw.data :
                  [];
        setNews(list);
      }

    };
    load();
  }, []);

  return { news };
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
        const academyName = c.academy_name || '';
        const clientName = c.client_name || '';
        const label = c.label || `${academyName} — ${clientName}`.trim();

        return {
          id: Number(c.id),
          academy_name: academyName,
          client_name: clientName,
          label,
          name: academyName || label || 'Academy',
          subtitle: clientName || '',
          searchText: `${academyName} ${clientName} ${label}`.toLowerCase(),
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
