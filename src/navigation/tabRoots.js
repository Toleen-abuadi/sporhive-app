const TAB_ROOTS = Object.freeze({
  home: Object.freeze(['/(app)/services', '/services']),
  discover: Object.freeze(['/academies']),
  book: Object.freeze([
    '/playgrounds',
    '/playgrounds/explore',
    '/playgrounds/bookings',
  ]),
  portal: Object.freeze([
    '/portal/home',
    '/portal/(tabs)/home',
    '/portal/more',
    '/portal/(tabs)/more',
    '/portal/renewals',
    '/portal/(tabs)/renewals',
  ]),
  profile: Object.freeze(['/portal/profile', '/portal/(tabs)/profile']),
});

const PORTAL_DETAIL_PATTERNS = Object.freeze([
  /^\/portal\/profile\/.+/,
  /^\/portal\/payments\/.+/,
  /^\/portal\/orders\/.+/,
  /^\/portal\/payment\/.+/,
  /^\/portal\/order\/.+/,
  /^\/portal\/renewals\/details(?:\/|$)/,
]);

const stripQuery = (value) => {
  if (typeof value !== 'string') return '';
  const [path] = value.split('?');
  return path || '';
};

const normalizePath = (value) => {
  const path = stripQuery(value);
  return path.replace(/\/+$/, '') || '/';
};

const matchesPath = (pathname, candidate) =>
  normalizePath(pathname) === normalizePath(candidate);

const TAB_ROOT_PATHS = Object.freeze(
  [...new Set(Object.values(TAB_ROOTS).flat().map((path) => normalizePath(path)))],
);

const isPortalDetailPath = (pathname) => {
  const path = normalizePath(pathname);
  return PORTAL_DETAIL_PATTERNS.some((pattern) => pattern.test(path));
};

const isTabRoot = (pathname) =>
  TAB_ROOT_PATHS.includes(normalizePath(pathname));

const isTabEligible = (pathname) => {
  const path = normalizePath(pathname);
  if (!path || path === '/') return false;
  if (path === '/(auth)' || path.startsWith('/(auth)/')) return false;
  if (path === '/auth' || path.startsWith('/auth/')) return false;
  if (isPortalDetailPath(path)) return false;
  return isTabRoot(path);
};

const getActiveTabKey = (pathname) => {
  const path = normalizePath(pathname);
  const keys = Object.keys(TAB_ROOTS);
  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i];
    if (TAB_ROOTS[key].some((root) => matchesPath(path, root))) {
      return key;
    }
  }
  return null;
};

module.exports = {
  TAB_ROOTS,
  TAB_ROOT_PATHS,
  PORTAL_DETAIL_PATTERNS,
  stripQuery,
  normalizePath,
  matchesPath,
  isPortalDetailPath,
  isTabRoot,
  isTabEligible,
  getActiveTabKey,
};
