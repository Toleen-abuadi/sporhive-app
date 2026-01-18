import type { Venue } from '../api/playgrounds.api';

let venuesCache: Venue[] = [];

export function setVenuesCache(venues: Venue[]) {
  venuesCache = venues;
}

export function getVenueById(id: string) {
  return venuesCache.find((venue) => venue.id === id) ?? null;
}

export function clearVenuesCache() {
  venuesCache = [];
}
