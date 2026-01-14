// Navigation helpers for Playgrounds routes.
export const navigate = (router, path, params, method = 'push') => {
  if (!router) return;
  if (params) {
    const fn = router[method] || router.push;
    fn({ pathname: path, params });
    return;
  }
  const fn = router[method] || router.push;
  fn(path);
};

export const goToIdentify = (router) => navigate(router, '/playgrounds/identify');
export const goToHome = (router) => navigate(router, '/playgrounds', null, 'replace');
export const goToSearch = (router) => navigate(router, '/playgrounds/search');
export const goToVenue = (router, venueId) => navigate(router, `/playgrounds/venue/${venueId}`);
export const goToBook = (router, venueId) => navigate(router, `/playgrounds/book/${venueId}`);
export const goToMyBookings = (router) => navigate(router, '/playgrounds/my-bookings');
export const goToBookingDetails = (router, bookingId) =>
  navigate(router, `/playgrounds/booking/${bookingId}`);
export const goToRate = (router) => navigate(router, '/playgrounds/rate');
export const goToRateToken = (router, token) => navigate(router, `/playgrounds/r/${token}`);
