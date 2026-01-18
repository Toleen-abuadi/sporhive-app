import { requestFormData, requestJson } from '../../../services/http';

type VenueAcademyProfile = {
  id: string;
  academy_id: string;
  public_name: string;
  location_text: string;
  maps_url: string | null;
  tags: string[] | null;
  special_offers_note: string | null;
  allow_cash: boolean;
  allow_cash_on_date: boolean;
  cash_on_date_extra_type: string | null;
  cash_on_date_extra_value: number | null;
  allow_cliq: boolean;
  cliq_name: string | null;
  cliq_number: string | null;
  integration_callback_url: string | null;
  integration_api_key: string | null;
  hero_image: string | null;
};

export type Venue = {
  id: string;
  academy_profile_id: string;
  activity_id: string;
  name: string;
  pitch_size: string | null;
  area_size: string | null;
  base_location: string | null;
  min_players: number | null;
  max_players: number | null;
  has_special_offer: boolean;
  special_offer_note: string | null;
  image: string | null;
  images: string[] | null;
  avg_rating: number | null;
  ratings_count: number | null;
  price: number | null;
  academy_profile: VenueAcademyProfile;
};

export type VenueListPayload = {
  activity_id?: string;
  date?: string;
  number_of_players: number;
  duration_id?: string;
  base_location?: string;
  academy_profile_id?: string;
  has_special_offer?: boolean;
  order_by?: 'price_asc' | 'rating_desc';
};

export type Duration = {
  id: string;
  minutes: number;
  base_price: number;
  is_default: boolean;
  is_active: boolean;
};

export type Slot = {
  start_time: string;
  end_time: string;
};

export type BookingPayment = Record<string, unknown>;

export type Booking = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  booking_code: string;
  number_of_players: number;
  academy: {
    public_name: string;
    phone_number?: string | null;
    location_text?: string | null;
  };
  venue: {
    name: string;
    base_location?: string | null;
  };
  payment?: BookingPayment;
};

export type PublicUser = {
  id: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  [key: string]: unknown;
};

export type PlaygroundsClient = Record<string, unknown>;

const normalizeUser = (data: unknown): PublicUser => {
  if (data && typeof data === 'object') {
    const payload = data as { user?: PublicUser };
    return payload.user ?? (data as PublicUser);
  }
  return {} as PublicUser;
};

const normalizeAuthResponse = (data: unknown) => {
  if (!data || typeof data !== 'object') {
    return { user: {} as PublicUser, client: {} as PlaygroundsClient };
  }
  const payload = data as {
    user?: PublicUser;
    playgrounds_client?: PlaygroundsClient;
    playground_client?: PlaygroundsClient;
    client?: PlaygroundsClient;
  };
  const user = payload.user ?? (data as PublicUser);
  const client =
    payload.playgrounds_client ?? payload.playground_client ?? payload.client ?? user;
  return { user, client };
};

export async function listVenues(payload: VenueListPayload) {
  const response = await requestJson<{ venues: Venue[] }>(
    '/api/v1/playgrounds/public/venues/list',
    payload,
  );
  return response.venues;
}

export async function listVenueDurations(venueId: string) {
  const response = await requestJson<{ durations: Duration[] }>(
    '/api/v1/playgrounds/admin/venues/durations/list',
    { venue_id: venueId },
  );
  return response.durations;
}

export async function listSlots(
  payload: { venue_id: string; date: string; duration_minutes: number },
  options?: { signal?: AbortSignal },
) {
  const response = await requestJson<{ slots: Slot[] }>(
    '/api/v1/playgrounds/public/slots',
    payload,
    options,
  );
  return response.slots;
}

type CreateBookingPayload = {
  academy_profile_id: string;
  user_id: string;
  activity_id: string;
  venue_id: string;
  duration_id: string;
  booking_date: string;
  start_time: string;
  number_of_players: number;
  payment_type: 'cash' | 'cliq';
  cash_payment_on_date: boolean;
  cliq_image?: File | Blob | null;
};

export type CreateBookingResponse = {
  booking_id: string;
  booking_code: string;
  total_price: number;
  payment: BookingPayment;
};

export async function createBooking(payload: CreateBookingPayload) {
  const formData = new FormData();
  formData.append('academy_profile_id', payload.academy_profile_id);
  formData.append('user_id', payload.user_id);
  formData.append('activity_id', payload.activity_id);
  formData.append('venue_id', payload.venue_id);
  formData.append('duration_id', payload.duration_id);
  formData.append('booking_date', payload.booking_date);
  formData.append('start_time', payload.start_time);
  formData.append('number_of_players', String(payload.number_of_players));
  formData.append('payment_type', payload.payment_type);
  formData.append('cash_payment_on_date', String(payload.cash_payment_on_date));

  if (payload.payment_type === 'cliq' && payload.cliq_image) {
    formData.append('cliq_image', payload.cliq_image);
  }

  return requestFormData<CreateBookingResponse>(
    '/api/v1/playgrounds/public/bookings/create',
    formData,
  );
}

export async function quickRegister(payload: { first_name: string; last_name: string; phone: string }) {
  const response = await requestJson<PublicUser | { user: PublicUser }>(
    '/api/v1/public-users/quick-register',
    payload,
  );
  return normalizeUser(response);
}

export async function loginPublicUser(payload: { phone: string; password: string }) {
  const response = await requestJson('/api/v1/public-users/login', payload);
  return normalizeAuthResponse(response);
}

export async function registerPublicUser(payload: {
  first_name: string;
  last_name: string;
  phone: string;
  password: string;
}) {
  const response = await requestJson('/api/v1/public-users/register', payload);
  return normalizeAuthResponse(response);
}

export async function requestPasswordReset(payload: { phone: string }) {
  return requestJson('/api/v1/public-users/password-reset/request', payload);
}

export async function confirmPasswordReset(payload: { phone: string; token: string; password: string }) {
  return requestJson('/api/v1/public-users/password-reset/confirm', payload);
}

export async function listMyBookings(payload: { user_id: string }) {
  const response = await requestJson<{ bookings: Booking[] }>(
    '/api/v1/playgrounds/public/bookings/list',
    payload,
  );
  return response.bookings;
}

export type ResolveRatingTokenResponse = {
  booking_id?: string;
  user_id?: string;
  [key: string]: unknown;
};

export async function resolveRatingToken(token: string) {
  return requestJson<ResolveRatingTokenResponse>(
    `/api/v1/playgrounds/public/rating/resolve-token/${token}`,
  );
}

export async function canRateBooking(payload: Record<string, unknown>) {
  return requestJson('/api/v1/playgrounds/public/rating/can-rate', payload);
}

export async function createRating(payload: Record<string, unknown>) {
  return requestJson('/api/v1/playgrounds/public/rating/create', payload);
}
