import { useCallback, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import { usePathname, useRouter } from 'expo-router';
import { useAuth } from '../services/auth/auth.store';

export const SIGNED_IN_FALLBACK_ROUTE = '/(app)/services';
export const SIGNED_OUT_FALLBACK_ROUTE = '/(auth)/entry';

const stripQuery = (value) => {
  if (typeof value !== 'string') return '';
  const [path] = value.split('?');
  return path || '';
};

const normalizeRoute = (value) => {
  const path = stripQuery(value);
  return path.replace(/\/+$/, '') || '/';
};

const isSameRoute = (a, b) => normalizeRoute(a) === normalizeRoute(b);

const canRouterGoBack = (router) =>
  Boolean(
    router &&
      typeof router.canGoBack === 'function' &&
      router.canGoBack(),
  );

const canNavigationGoBack = (navigation) =>
  Boolean(
    navigation &&
      typeof navigation.canGoBack === 'function' &&
      navigation.canGoBack(),
  );

export const resolveSmartBackFallback = ({
  explicitFallback,
  signedIn,
  signedInFallbackRoute = SIGNED_IN_FALLBACK_ROUTE,
  signedOutFallbackRoute = SIGNED_OUT_FALLBACK_ROUTE,
}) => {
  if (explicitFallback) return explicitFallback;
  return signedIn ? signedInFallbackRoute : signedOutFallbackRoute;
};

export const executeSmartBack = ({
  navigation,
  router,
  pathname,
  fallbackRoute = SIGNED_IN_FALLBACK_ROUTE,
  allowDismiss = true,
}) => {
  if (canNavigationGoBack(navigation)) {
    navigation.goBack();
    return true;
  }

  if (canRouterGoBack(router)) {
    router.back();
    return true;
  }

  if (allowDismiss && navigation && typeof navigation.dismiss === 'function') {
    try {
      navigation.dismiss();
      return true;
    } catch {
      // Some navigator types do not support dismiss; fallback to route replace.
    }
  }

  if (router && typeof router.replace === 'function') {
    if (!isSameRoute(pathname, fallbackRoute)) {
      router.replace(fallbackRoute);
      return false;
    }
  }

  return false;
};

export function useSmartBack({
  fallbackRoute,
  signedInFallbackRoute = SIGNED_IN_FALLBACK_ROUTE,
  signedOutFallbackRoute = SIGNED_OUT_FALLBACK_ROUTE,
  allowDismiss = true,
} = {}) {
  const router = useRouter();
  const navigation = useNavigation();
  const pathname = usePathname();
  const { isAuthenticated, token, session } = useAuth();

  const isSignedIn = useMemo(
    () => Boolean(isAuthenticated || token || session),
    [isAuthenticated, session, token],
  );

  const resolvedFallbackRoute = useMemo(
    () =>
      resolveSmartBackFallback({
        explicitFallback: fallbackRoute,
        signedIn: isSignedIn,
        signedInFallbackRoute,
        signedOutFallbackRoute,
      }),
    [
      fallbackRoute,
      isSignedIn,
      signedInFallbackRoute,
      signedOutFallbackRoute,
    ],
  );

  const goBack = useCallback(
    () =>
      executeSmartBack({
        navigation,
        router,
        pathname,
        fallbackRoute: resolvedFallbackRoute,
        allowDismiss,
      }),
    [allowDismiss, navigation, pathname, resolvedFallbackRoute, router],
  );

  const canGoBack = useMemo(
    () => canNavigationGoBack(navigation) || canRouterGoBack(router),
    [navigation, router],
  );

  return {
    canGoBack,
    fallbackRoute: resolvedFallbackRoute,
    goBack,
  };
}

