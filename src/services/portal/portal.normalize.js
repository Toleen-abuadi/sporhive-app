const pick = (obj, paths, fallback = undefined) => {
  for (const path of paths) {
    const parts = path.split('.');
    let cur = obj;
    let ok = true;
    for (const part of parts) {
      if (!cur || typeof cur !== 'object' || !(part in cur)) {
        ok = false;
        break;
      }
      cur = cur[part];
    }
    if (ok && cur !== undefined && cur !== null) return cur;
  }
  return fallback;
};

const toArray = (v) => (Array.isArray(v) ? v : v ? [v] : []);
const safeStr = (v) => (typeof v === 'string' ? v : v == null ? '' : String(v));
const safeNumber = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export const normalizePortalOverview = (raw) => {
  const data = raw?.data ?? raw ?? {};
  const root = data?.player_data ? data : { ...data, player_data: data };
  const playerData = pick(root, ['player_data'], {}) || {};

  const playerInfo = pick(playerData, ['player_info', 'profile.player_info', 'playerInfo'], {}) || {};
  const registrationInfo = pick(playerData, ['registration_info', 'registration'], {}) || {};
  const healthInfo = pick(playerData, ['health_info', 'health'], {}) || {};

  const phoneNumbers = pick(playerInfo, ['phone_numbers'], {}) || {};
  const phone1 = phoneNumbers?.['1'] || phoneNumbers?.[1] || pick(playerInfo, ['phone_number_1', 'phone1', 'phone'], '');
  const phone2 = phoneNumbers?.['2'] || phoneNumbers?.[2] || pick(playerInfo, ['phone_number_2', 'phone2'], '');

  const profileImage = pick(playerData, ['profile_image', 'profileImage'], null);
  const imgB64 =
    pick(profileImage, ['image'], '') ||
    pick(playerInfo, ['image', 'image_base64', 'imageBase64'], '') ||
    pick(playerData, ['image', 'image_base64', 'imageBase64'], '');
  const imgMime = pick(profileImage, ['image_type', 'mime', 'mime_type'], '') || 'image/jpeg';
  const imgDataUri = imgB64
    ? String(imgB64).startsWith('data:')
      ? String(imgB64)
      : `data:${imgMime};base64,${imgB64}`
    : '';

  const academyName = pick(root, ['academy_name'], pick(data, ['academy_name', 'academyName', 'academy.name'], ''));

  const player = {
    id: pick(playerInfo, ['id'], pick(playerData, ['player_id', 'playerId'], null)),
    firstName: pick(playerInfo, ['first_eng_name', 'first_name', 'firstName'], ''),
    lastName: pick(playerInfo, ['last_eng_name', 'last_name', 'lastName'], ''),
    fullName:
      [
        pick(playerInfo, ['first_eng_name'], ''),
        pick(playerInfo, ['middle_eng_name'], ''),
        pick(playerInfo, ['last_eng_name'], ''),
      ]
        .filter(Boolean)
        .join(' ') ||
      [
        pick(playerInfo, ['first_ar_name'], ''),
        pick(playerInfo, ['middle_ar_name'], ''),
        pick(playerInfo, ['last_ar_name'], ''),
      ]
        .filter(Boolean)
        .join(' ') ||
      pick(playerInfo, ['full_name', 'fullName'], ''),
    phone: safeStr(phone1),
    phone2: safeStr(phone2),
    imageBase64: imgDataUri,
    imageMime: imgMime,
    academyName,
  };

  const registration = {
    try_out_id: pick(registrationInfo, ['try_out_id'], null),
    registration_type: pick(registrationInfo, ['registration_type'], ''),
    groupName: pick(registrationInfo, ['group_name', 'groupName'], ''),
    courseName: pick(registrationInfo, ['course_name', 'courseName'], ''),
    level: pick(registrationInfo, ['level'], ''),
    schedulePreview: toArray(pick(registrationInfo, ['schedule', 'schedule_preview'], [])),
    startDate: pick(registrationInfo, ['start_date'], null),
    endDate: pick(registrationInfo, ['end_date'], null),
    totalSessions: safeNumber(pick(registrationInfo, ['number_of_sessions', 'num_of_sessions'], 0), 0),
    remainingSessions: safeNumber(pick(root, ['performance_feedback.metrics.remaining_sessions'], 0), 0),
    address: pick(registrationInfo, ['address'], ''),
    google_maps_location: pick(registrationInfo, ['google_maps_location'], ''),
    availableCourses: toArray(pick(registrationInfo, ['available_courses', 'courses'], [])),
    availableGroups: toArray(pick(registrationInfo, ['available_groups', 'groups'], [])),
  };

  const payments = toArray(pick(root, ['payment_info', 'payments'], []));
  const subscriptionHistory = toArray(pick(root, ['subscription_history', 'history'], []));

  const creditsData = pick(data, ['credits'], {}) || {};
  const credits = {
    totalRemaining: safeNumber(pick(creditsData, ['total_remaining', 'remaining', 'total'], 0), 0),
    nextExpiry: pick(creditsData, ['next_expiry', 'next_expiry_at', 'nextExpiry'], ''),
    active: toArray(pick(creditsData, ['active', 'items', 'credits'], [])),
  };

  const performance = {
    summary: pick(data, ['performance_feedback.summary'], ''),
    metrics: pick(data, ['performance_feedback.metrics'], {}) || {},
  };
  const levels = toArray(pick(data, ['levels'], []));

  return {
    academyName,
    player,
    registration,
    payments,
    subscriptionHistory,
    health: healthInfo,
    credits,
    performance,
    levels,
    raw: data,
  };
};
