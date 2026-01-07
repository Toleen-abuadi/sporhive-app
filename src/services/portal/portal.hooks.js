// src/services/portal/portal.hooks.js
import { useCallback, useEffect, useRef, useState } from 'react';
import { portalApi } from './portal.api';
import { normalizePortalOverview } from './portal.normalize';

export const usePortalOverview = () => {
  const mounted = useRef(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [overview, setOverview] = useState(null);

  const load = useCallback(async (mode = 'initial') => {
    try {
      mode === 'initial' ? setLoading(true) : setRefreshing(true);
      setError(null);
      const res = await portalApi.getOverview();
      const norm = normalizePortalOverview(res);
      if (mounted.current) setOverview(norm);
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
    load('initial');
    return () => {
      mounted.current = false;
    };
  }, [load]);

  const refresh = useCallback(() => load('refresh'), [load]);

  return { overview, loading, refreshing, error, refresh, setOverview };
};
