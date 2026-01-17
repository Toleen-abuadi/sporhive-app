// src/services/playgrounds/playgrounds.normalize.js
const ensureArray = (value) => (Array.isArray(value) ? value : []);

const pickVenueImage = (venue) => {
  if (!venue) return null;
  
  // Try different image sources in order of preference
  if (venue?.image) return venue.image;
  if (venue?.main_image) return venue.main_image;
  const firstImage = ensureArray(venue?.images)[0];
  if (firstImage?.url) return first.url;
  if (typeof firstImage === 'string') return firstImage;
  
  // Check academy profile for hero image
  const academyHero = venue?.academy_profile?.hero_image;
  if (academyHero) return academyHero;
  
  // Check if hero_image is in data:image format
  if (venue?.academy_profile?.hero_image?.startsWith?.('data:image')) {
    return venue.academy_profile.hero_image;
  }
  
  return null;
};

const normalizeVenue = (v) => {
  if (!v) return null;

  const academy = v.academy_profile || {};
  const imageUri = pickVenueImage(v);

  const city = 
    v?.base_location ||
    academy?.location_text ||
    academy?.public_name ||
    'Unknown Location';

  const sport = v?.activity?.name || 
                (v.activity_id === "9a83bd0a-463a-4005-8720-f6ed8ab5010c" ? "Football" : 
                 v.activity_id === "d9740933-c3d1-4746-85fa-6432eaf4f20c" ? "Tennis" : 
                 "Sports");

  return {
    id: v.id || String(v.academy_profile_id) || 'unknown',
    name: v.name || academy?.public_name || 'Unknown Venue',
    city: city,
    sport: sport,
    rating: Number(v.avg_rating || v.ratings_count || 0).toFixed(1),
    price: v.price || v.duration?.base_price || 'Price on request',
    price_per_hour: parseFloat(v.price || v.duration?.base_price || 15),
    image: imageUri,
    
    // Additional fields for details screen
    description: v.description || `${sport} venue at ${city}`,
    size: v.pitch_size || v.area_size || 'Standard',
    min_players: v.min_players || 1,
    max_players: v.max_players || 10,
    location: v.base_location || city,
    has_special_offer: v.has_special_offer || false,
    special_offer_note: v.special_offer_note || '',
    
    // Backend fields preservation
    academy_profile_id: v.academy_profile_id,
    activity_id: v.activity_id,
    avg_rating: Number(v.avg_rating || 0),
    ratings_count: Number(v.ratings_count || 0),
    
    academy_profile: {
      id: academy?.id || v.academy_profile_id,
      public_name: academy?.public_name,
      location_text: academy?.location_text,
      tags: ensureArray(academy?.tags),
      allow_cash: Boolean(academy?.allow_cash),
      allow_cash_on_date: Boolean(academy?.allow_cash_on_date),
      allow_cliq: Boolean(academy?.allow_cliq),
      cliq_name: academy?.cliq_name,
      cliq_number: academy?.cliq_number,
      hero_image: academy?.hero_image,
    },
    
    // For booking stepper
    venue_id: v.id || v.academy_profile_id,
  };
};

const normalizeAcademySlider = (a) => {
  if (!a) return null;
  
  return {
    id: a.academy_id || a.academy_profile_id || 'unknown',
    academy_id: a.academy_id,
    academy_profile_id: a.academy_profile_id,
    public_name: a.public_name || 'Academy',
    location_text: a.location_text || '',
    tags: ensureArray(a.tags),
    special_offers_note: a.special_offers_note || '',
    hero_image: a.hero_image || null,
    image: a.hero_image || null, // For slider component compatibility
  };
};

const normalizeBooking = (b) => {
  if (!b) return null;

  const academy = b.academy || {};
  const venue = b.venue || {};
  const activity = b.activity || {};
  const duration = b.duration || {};

  return {
    id: b.id,
    booking_id: b.id,
    booking_code: b.booking_code,
    status: b.status || 'pending',
    
    // Date and time
    date: b.date,
    time: b.start_time || 'TBD',
    start_time: b.start_time,
    end_time: b.end_time,
    slot_time: `${b.start_time || ''} - ${b.end_time || ''}`,
    
    // Players and price
    players: b.number_of_players,
    players_count: b.number_of_players,
    total_price: duration?.base_price || '0',
    price: duration?.base_price || '0',
    
    // Payment
    payment_method: b.payment_method || 'cash',
    payment_type: b.payment_type || 'cash',
    
    // Venue and academy info
    venue_id: venue?.id,
    venue_name: venue?.name || academy?.public_name || 'Venue',
    venue: venue?.name || academy?.public_name,
    academy_name: academy?.public_name,
    
    // Duration
    duration_minutes: duration?.minutes || 60,
    
    // Card-friendly display
    code: b.booking_code || '—',
    total: `${duration?.base_price || 0} JOD`,
    
    // Full objects for details
    academy: academy,
    venue: venue,
    activity: activity,
    duration: duration,
  };
};

const normalizeSlot = (s) => {
  if (!s) return null;
  
  const start = s.start_time || s.start || s.from || '';
  const end = s.end_time || s.end || s.to || '';
  const label = start && end ? `${start} - ${end}` : (start || end || 'Available');
  
  return {
    id: s.id || `${start}-${end}`,
    start_time: start,
    end_time: end,
    label: label,
    time: label,
    slot_id: s.id || `${start}-${end}`,
  };
};

export const normalizeSliderItems = (payload) => {
  if (!payload) return [];
  
  const list = Array.isArray(payload)
    ? payload
    : ensureArray(payload.academies || payload.items || payload.data || []);
  
  return list.map(normalizeAcademySlider).filter(Boolean);
};

export const normalizeVenueList = (payload) => {
  if (!payload) return [];
  
  const list = Array.isArray(payload)
    ? payload
    : ensureArray(payload.venues || payload.items || payload.data || []);
  
  return list.map(normalizeVenue).filter(Boolean);
};

export const normalizeVenueDetails = (payload) => {
  if (!payload) return null;
  
  // Handle both direct venue object and nested structure
  const raw = payload.venue || payload.data || payload;
  return normalizeVenue(raw);
};

export const normalizeSlots = (payload) => {
  if (!payload) return [];
  
  const list = ensureArray(payload.slots || payload.data || payload.items || []);
  return list.map(normalizeSlot).filter(Boolean);
};

export const normalizeBookings = (payload) => {
  if (!payload) return [];
  
  const list = Array.isArray(payload)
    ? payload
    : ensureArray(payload.bookings || payload.items || payload.data || []);
  
  return list.map(normalizeBooking).filter(Boolean);
};

export const normalizeBookingDetails = (payload) => {
  if (!payload) return null;
  
  const raw = payload.booking || payload.data || payload;
  return normalizeBooking(raw);
};

export const normalizeRating = (payload) => {
  if (!payload) return null;
  return payload.rating || payload.data || payload;
};