import { getJSON, remove, setJSON, STORAGE_KEYS } from '../services/storage';

/**
 * @typedef {{
 *  venueId: string,
 *  academyProfileId: string,
 *  draft: {
 *    selectedDurationId?: string,
 *    bookingDate?: string,
 *    players?: number,
 *    selectedSlot?: { start_time: string, end_time: string },
 *    paymentType?: 'cash'|'cliq',
 *    cashOnDate?: boolean,
 *    currentStep?: number
 *  }
 * }} BookingDraft
 */

export async function saveDraft(draft) {
  await setJSON(STORAGE_KEYS.BOOKING_DRAFT, draft);
}

export async function loadDraft() {
  return getJSON(STORAGE_KEYS.BOOKING_DRAFT);
}

export async function clearDraft() {
  await remove(STORAGE_KEYS.BOOKING_DRAFT);
}
