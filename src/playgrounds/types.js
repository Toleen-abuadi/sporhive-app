/**
 * @typedef {{ id?: string|number, first_name?: string, last_name?: string, name?: string, email?: string, phone?: string }} PublicUser
 * @typedef {{ id?: string|number, name?: string, city?: string, country?: string }} AcademyProfile
 * @typedef {{ id?: string|number, url?: string, path?: string, kind?: string }} VenueImage
 * @typedef {{ id?: string|number, label?: string, minutes?: number, duration_minutes?: number, price?: number, currency?: string }} VenueDuration
 * @typedef {{ id?: string|number, start_time?: string, end_time?: string, start?: string, end?: string, status?: string, price?: number, currency?: string }} Slot
 * @typedef {{
 *   id?: string|number,
 *   name?: string,
 *   title?: string,
 *   academy_profile_id?: string|number,
 *   academy_profile?: AcademyProfile,
 *   activity_id?: string|number,
 *   city?: string,
 *   country?: string,
 *   address?: string,
 *   images?: VenueImage[],
 *   venue_images?: VenueImage[],
 *   durations?: VenueDuration[],
 *   venue_durations?: VenueDuration[],
 *   slots?: Slot[],
 *   available_slots?: Slot[],
 *   rating?: number,
 *   avg_rating?: number,
 *   currency?: string
 * }} Venue
 * @typedef {{
 *   id?: string|number,
 *   booking_id?: string|number,
 *   booking_code?: string,
 *   booking_date?: string,
 *   date?: string,
 *   venue?: Venue,
 *   duration?: VenueDuration,
 *   slot?: Slot,
 *   total?: number,
 *   total_price?: number|string,
 *   currency?: string,
 *   status?: string
 * }} Booking
 */

export {};
