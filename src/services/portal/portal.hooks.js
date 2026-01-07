// src/services/portal/portal.hooks.js
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { portalApi } from './portal.api';
import { normalizePortalOverview } from './portal.normalize';
import { portalStore } from './portal.store';

export const usePortalOverview = () => {
  const mounted = useRef(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // seed from store first (instant UI)
  const seed = portalStore.getState().overview;
  const [overview, setOverview] = useState(seed);

  const load = useCallback(async (mode = 'initial') => {
    try {
      mode === 'initial' ? setLoading(true) : setRefreshing(true);
      setError(null);

      const res = await portalApi.getOverview();
      const norm = normalizePortalOverview(res);

      if (mounted.current) setOverview(norm);
      portalStore.setOverview({ raw: res?.data ?? res, normalized: norm });

      return norm;
    } catch (e) {
      if (mounted.current) setError(e);
      return null;
    } finally {
      if (!mounted.current) return;
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;

    // subscribe to store updates (other screens/modals can refresh)
    const unsub = portalStore.subscribe((s) => {
      if (!mounted.current) return;
      if (s.overview) setOverview(s.overview);
    });

    // if nothing cached, load
    if (!portalStore.getState().overview) load('initial');
    else setLoading(false);

    return () => {
      mounted.current = false;
      unsub?.();
    };
  }, [load]);

  const refresh = useCallback(() => load('refresh'), [load]);

  const setOverviewSafe = useCallback((next) => {
    setOverview(next);
    portalStore.setOverview({ normalized: next });
  }, []);

  return { overview, loading, refreshing, error, refresh, setOverview: setOverviewSafe };
};

// Convenience: read cached overview without forcing fetch
export const usePortalCachedOverview = () => {
  const [snap, setSnap] = useState(portalStore.getState());
  useEffect(() => portalStore.subscribe(setSnap), []);
  return useMemo(() => snap, [snap]);
};
