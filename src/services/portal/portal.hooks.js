// src/services/portal/portal.hooks.js
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePortal } from './portal.store';
import { portalApi } from './portal.api';
import { normalizePortalOverview } from './portal.normalize';
import { portalStore } from './portal.store';

/**
 * Dashboard overview
 */
export function useDashboard() {
  const { academyId } = usePortal();
  const mounted = useRef(true);

  const seed = portalStore.getState().overview;
  const [overview, setOverview] = useState(seed);
  const [loading, setLoading] = useState(!seed);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(
    async (mode = 'initial') => {
      try {
        mode === 'initial' ? setLoading(true) : setRefreshing(true);
        setError(null);

        // ✅ portalApi.getOverview will throw early if missing token/id
        const res = await portalApi.getOverview({ academyId });

        if (!res?.success) throw res?.error || new Error('Overview failed');

        const raw = res.data;
        // apiClient interceptor already returns data, so raw is the JSON response.
        const norm = normalizePortalOverview(raw?.data || raw);

        if (mounted.current) setOverview(norm);
        portalStore.setOverview(norm);
        return norm;
      } catch (e) {
        if (mounted.current) setError(e);
        return null;
      } finally {
        if (!mounted.current) return;
        setLoading(false);
        setRefreshing(false);
      }
    },
    [academyId]
  );

  useEffect(() => {
    mounted.current = true;

    const unsub = portalStore.subscribe((s) => {
      if (!mounted.current) return;
      if (s.overview) setOverview(s.overview);
    });

    // Load if not available
    if (!portalStore.getState().overview) {
      load('initial');
    } else {
      setLoading(false);
    }

    return () => {
      mounted.current = false;
      unsub?.();
    };
  }, [load]);

  const refresh = useCallback(() => load('refresh'), [load]);

  return { overview, loading, refreshing, error, refresh };
}

/**
 * Shared overview hook (used by modals)
 * Keeps naming consistent with modal imports: usePortalOverview()
 */
export function usePortalOverview() {
  return useDashboard();
}

/**
 * Password reset
 */
export function usePasswordReset() {
  const { resetPassword, isLoading, error } = usePortal();
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
 * Response items: {id, academy_name, client_name, label}
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
