import {
  executeSmartBack,
  SIGNED_IN_FALLBACK_ROUTE,
} from './useSmartBack';

export const safeBack = (router, fallback = SIGNED_IN_FALLBACK_ROUTE) =>
  executeSmartBack({
    router,
    fallbackRoute: fallback,
    allowDismiss: false,
  });
