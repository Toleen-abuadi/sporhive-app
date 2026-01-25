/**
 * @typedef {{ id?: string|number, name?: string, first_name?: string, last_name?: string, email?: string, phone?: string, mode?: 'registered' }} PublicUser
 * @typedef {{ id?: string|number, name?: string, city?: string, country?: string }} AcademyProfile
 * @typedef {{ id?: string|number, name?: string }} Activity
 * @typedef {{ id?: string|number, url?: string, path?: string, kind?: string, is_cover?: boolean, is_primary?: boolean }} VenueImage
 * @typedef {{ id?: string|number, label?: string, minutes?: number, duration_minutes?: number, price?: number, currency?: string }} VenueDuration
 * @typedef {{ id?: string|number, start?: string, end?: string, start_time?: string, end_time?: string, is_available?: boolean, status?: string, price?: number, currency?: string }} Slot
 * @typedef {{
 *   id?: string|number,
 *   name?: string,
 *   title?: string,
 *   academy_profile_id?: string|number,
 *   activity_id?: string|number,
 *   city?: string,
 *   country?: string,
 *   address?: string,
 *   sport?: string,
 *   sport_type?: string,
 *   rating?: number,
 *   avg_rating?: number,
 *   images?: VenueImage[],
 *   venue_images?: VenueImage[],
 *   durations?: VenueDuration[],
 *   venue_durations?: VenueDuration[],
 *   slots?: Slot[],
 *   available_slots?: Slot[],
 *   price_from?: number,
 *   starting_price?: number,
 *   currency?: string
 * }} Venue
 * @typedef {{
 *   id?: string|number,
 *   date?: string,
 *   booking_date?: string,
 *   booking_id?: string|number,
 *   booking_code?: string,
 *   venue?: Venue,
 *   slot?: Slot,
 *   duration?: VenueDuration,
 *   total?: number,
 *   total_price?: number|string,
 *   currency?: string,
 *   status?: string
 * }} Booking
 */

export {};
