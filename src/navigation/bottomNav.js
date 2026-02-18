import { useMemo } from 'react';
import { usePathname, useSegments } from 'expo-router';
import { spacing } from '../theme/tokens';
const { getActiveTabKey, isTabEligible, normalizePath } = require('./tabRoots');

export const BOTTOM_NAV_HEIGHT = 68;
export const BOTTOM_NAV_FLOAT_OFFSET = spacing.sm;
export const BOTTOM_NAV_CONTENT_INSET = BOTTOM_NAV_HEIGHT + spacing.lg;

const isAuthRoute = ({ segments, pathname }) => {
  const path = normalizePath(pathname);
  if (segments?.[0] === '(auth)') return true;
  if (path === '/(auth)' || path.startsWith('/(auth)/')) return true;
  if (path === '/auth' || path.startsWith('/auth/')) return true;
  return false;
};

export const isBottomNavRoute = ({ segments, pathname }) => {
  if (isAuthRoute({ segments, pathname })) return false;
  return isTabEligible(pathname);
};

export const getBottomNavActiveKey = ({ segments, pathname }) => {
  if (!isBottomNavRoute({ segments, pathname })) return null;
  return getActiveTabKey(pathname);
};

export function useBottomNavVisibility() {
  const segments = useSegments();
  const pathname = usePathname();

  return useMemo(
    () => isBottomNavRoute({ segments, pathname }),
    [pathname, segments],
  );
}

export function useBottomNavInset({ enabled = true } = {}) {
  const visible = useBottomNavVisibility();

  return useMemo(() => {
    if (!enabled || !visible) return 0;
    return BOTTOM_NAV_CONTENT_INSET;
  }, [enabled, visible]);
}
