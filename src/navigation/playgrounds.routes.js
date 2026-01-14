// Playgrounds Expo Router helpers for consistent navigation paths.
export const goToSearch = (router, params = {}) =>
  router.push({ pathname: '/playgrounds/search', params });

export const goToVenue = (router, venueId) =>
  router.push({ pathname: '/playgrounds/venue/[venueId]', params: { venueId: String(venueId) } });

export const goToBook = (router, venueId, preselectedDuration = {}) =>
  router.push({
    pathname: '/playgrounds/book/[venueId]',
    params: {
      venueId: String(venueId),
      ...(preselectedDuration || {}),
    },
  });

export const goToMyBookings = (router) => router.push('/playgrounds/my-bookings');

export const goToBookingDetails = (router, bookingId) =>
  router.push({ pathname: '/playgrounds/booking/[bookingId]', params: { bookingId: String(bookingId) } });

export const goToRateToken = (router, token) =>
  router.push({ pathname: '/playgrounds/r/[token]', params: { token: String(token) } });
