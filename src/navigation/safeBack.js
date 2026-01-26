export const safeBack = (router, fallback = '/(app)/services') => {
  if (router?.canGoBack && typeof router.canGoBack === 'function' && router.canGoBack()) {
    router.back();
    return true;
  }
  if (router?.replace && typeof router.replace === 'function') {
    router.replace(fallback);
    return false;
  }
  return false;
};
