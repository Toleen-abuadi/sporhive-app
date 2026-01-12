// src/services/portal/portal.hooks.js
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { portalApi } from './portal.api';
import { portalStore, usePortal as usePortalAuth } from './portal.store';

/**
 * Overview state hook
 */
export function usePortal() {
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

export function usePlayerPortal() {
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

// Backwards compatibility for older screens
export function usePortalOverview() {
  return usePortal();
}

/**
 * Password reset
 */
export function usePasswordReset() {
  const { resetPassword, isLoading, error } = usePortalAuth();
  const [success, setSuccess] = useState(false);

  const requestReset = useCallback(
    async ({ academyId, username, phoneNumber }) => {
      setSuccess(false);
      const result = await resetPassword({ academyId, username, phoneNumber });
      if (result?.success) setSuccess(true);
      return result;
    },
    [resetPassword]
  );

  return { requestReset, isLoading, error, success };
}

/**
 * Academies list (customer/active-list)
 */
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

      const res = await portalApi.listAcademiesActive();
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
