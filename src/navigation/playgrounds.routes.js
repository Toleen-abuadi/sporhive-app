import { useRouter } from 'expo-router';

const navigate = (router, path, params, method = 'push') => {
  if (!router) return;
  if (params) {
    router[method]({ pathname: path, params });
    return;
  }
  router[method](path);
};

export const usePlaygroundsRouter = () => {
  const router = useRouter();
  return {
    goToPlaygroundsHome: (options = {}) => goToPlaygroundsHome(router, options),
    goToSearch: (params, options = {}) => goToSearch(router, params, options),
    goToVenue: (venueId, params, options = {}) => goToVenue(router, venueId, params, options),
    goToBook: (venueId, params, options = {}) => goToBook(router, venueId, params, options),
    goToMyBookings: (options = {}) => goToMyBookings(router, options),
    goToBookingDetails: (bookingId, params, options = {}) => goToBookingDetails(router, bookingId, params, options),
    goToRate: (options = {}) => goToRate(router, options),
    goToRateToken: (token, options = {}) => goToRateToken(router, token, options),
    goToIdentify: (options = {}) => goToIdentify(router, options),
  };
};

export function goToPlaygroundsHome(router, options = {}) {
  navigate(router, '/playgrounds', options.params, options.method || 'push');
}

export function goToSearch(router, params, options = {}) {
  navigate(router, '/playgrounds/search', params, options.method || 'push');
}

export function goToVenue(router, venueId, params, options = {}) {
  if (!venueId) return;
  navigate(router, `/playgrounds/venue/${venueId}`, params, options.method || 'push');
}

export function goToBook(router, venueId, params, options = {}) {
  if (!venueId) return;
  navigate(router, `/playgrounds/book/${venueId}`, params, options.method || 'push');
}

export function goToMyBookings(router, options = {}) {
  navigate(router, '/playgrounds/my-bookings', options.params, options.method || 'push');
}

export function goToBookingDetails(router, bookingId, params, options = {}) {
  if (!bookingId) return;
  navigate(router, `/playgrounds/booking/${bookingId}`, params, options.method || 'push');
}

export function goToRate(router, options = {}) {
  navigate(router, '/playgrounds/rate', options.params, options.method || 'push');
}

export function goToRateToken(router, token, options = {}) {
  if (!token) return;
  navigate(router, `/playgrounds/r/${token}`, options.params, options.method || 'push');
}

export function goToIdentify(router, options = {}) {
  navigate(router, '/playgrounds/identify', options.params, options.method || 'push');
}
