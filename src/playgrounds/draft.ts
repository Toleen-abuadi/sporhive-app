import { getJSON, remove, setJSON, STORAGE_KEYS } from '../services/storage';

export type BookingDraft = {
  venueId: string;
  academyProfileId: string;
  draft: {
    selectedDurationId?: string;
    bookingDate?: string;
    players?: number;
    selectedSlot?: { start_time: string; end_time: string };
    paymentType?: 'cash' | 'cliq';
    cashOnDate?: boolean;
    currentStep?: number;
  };
};

export async function saveDraft(draft: BookingDraft): Promise<void> {
  await setJSON(STORAGE_KEYS.BOOKING_DRAFT, draft);
}

export async function loadDraft(): Promise<BookingDraft | null> {
  return getJSON<BookingDraft>(STORAGE_KEYS.BOOKING_DRAFT);
}

export async function clearDraft(): Promise<void> {
  await remove(STORAGE_KEYS.BOOKING_DRAFT);
}
