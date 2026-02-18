import { useMemo } from 'react';
import { usePathname, useSegments } from 'expo-router';
import { spacing } from '../theme/tokens';

export const BOTTOM_NAV_HEIGHT = 68;
export const BOTTOM_NAV_FLOAT_OFFSET = spacing.sm;
export const BOTTOM_NAV_CONTENT_INSET = BOTTOM_NAV_HEIGHT + spacing.lg;

const PORTAL_ROOT_TABS = new Set(['home', 'renewals', 'more', 'profile']);
const PLAYGROUNDS_ROOT_ROUTES = new Set([undefined, 'explore', 'bookings']);

const stripQuery = (value) => {
  if (typeof value !== 'string') return '';
  const [path] = value.split('?');
  return path || '';
};

const normalizePath = (value) => {
  const path = stripQuery(value);
  return path.replace(/\/+$/, '') || '/';
};

const isServicesRoot = (segments, pathname) => {
  const seg0 = segments?.[0];
  const seg1 = segments?.[1];
  const path = normalizePath(pathname);
  return (
    (seg0 === '(app)' && seg1 === 'services') ||
    seg0 === 'services' ||
    path === '/(app)/services' ||
    path === '/services'
  );
};

const isAcademiesRoot = (segments) => {
  const seg0 = segments?.[0];
  const seg1 = segments?.[1];
  return seg0 === 'academies' && !seg1;
};

const isPlaygroundsRoot = (segments) => {
  const seg0 = segments?.[0];
  const seg1 = segments?.[1];
  return seg0 === 'playgrounds' && PLAYGROUNDS_ROOT_ROUTES.has(seg1);
};

const getPortalTabSegment = (segments) => {
  const seg0 = segments?.[0];
  const seg1 = segments?.[1];
  const seg2 = segments?.[2];

  if (seg0 !== 'portal') return null;
  if (seg1 === '(tabs)' && PORTAL_ROOT_TABS.has(seg2)) return seg2;
  if (PORTAL_ROOT_TABS.has(seg1)) return seg1;
  return null;
};

export const isBottomNavRoute = ({ segments, pathname }) => {
  if (!Array.isArray(segments) || segments.length === 0) return false;
  if (segments[0] === '(auth)') return false;

  if (isServicesRoot(segments, pathname)) return true;
  if (isAcademiesRoot(segments)) return true;
  if (isPlaygroundsRoot(segments)) return true;
  return Boolean(getPortalTabSegment(segments));
};

export const getBottomNavActiveKey = ({ segments, pathname }) => {
  const portalTab = getPortalTabSegment(segments);
  if (portalTab === 'profile') return 'profile';
  if (portalTab) return 'portal';
  if (isPlaygroundsRoot(segments)) return 'book';
  if (isAcademiesRoot(segments)) return 'discover';
  if (isServicesRoot(segments, pathname)) return 'home';
  return null;
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
