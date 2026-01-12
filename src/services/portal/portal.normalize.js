// src/services/portal/portal.normalize.js
const pick = (obj, paths, fallback = undefined) => {
  for (const p of paths) {
    const parts = p.split('.');
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

export const normalizePortalOverview = (raw) => {
  // apiClient interceptor returns the JSON body directly, but some callers may
  // pass {data: ...}. Support both.
  const data = raw?.data ?? raw ?? {};

  // Current backend response shape (Jan 2026):
  // {
  //   player_data: { player_info, registration_info, health_info, profile_image, ... },
  //   payment_info: [...],
  //   subscription_history: [...],
  //   performance_feedback: { metrics, summary },
  //   academy_name: "..."
  // }
  // Older builds may be flat. Support both by unwrapping when present.
  const root = pick(data, ['player_data'], null) ? data : { ...data, player_data: data };
  const pd = pick(root, ['player_data'], {}) || {};

  const playerInfo = pick(pd, ['player_info', 'profile.player_info', 'playerInfo'], {}) || {};
  const regInfo = pick(pd, ['registration_info', 'current_reg', 'registration'], {}) || {};
  const healthInfo = pick(pd, ['health_info', 'health'], {}) || {};

  const tryOut =
    pick(regInfo, ['try_out', 'tryOut'], null) ||
    pick(pd, ['try_out', 'tryOut'], null) ||
    (pick(regInfo, ['try_out_id'], null) || pick(pd, ['try_out_id', 'tryOutId'], null)
      ? { id: pick(regInfo, ['try_out_id'], null) || pick(pd, ['try_out_id', 'tryOutId'], null) }
      : null);

  const phoneNumbers = pick(playerInfo, ['phone_numbers'], {}) || {};
  const phone1 = phoneNumbers?.['1'] || phoneNumbers?.[1] || pick(playerInfo, ['phone_number_1', 'phone1', 'phone'], '');
  const phone2 = phoneNumbers?.['2'] || phoneNumbers?.[2] || pick(playerInfo, ['phone_number_2', 'phone2'], '');

  const profileImage = pick(pd, ['profile_image', 'profileImage'], null);
  const imgB64 =
    pick(profileImage, ['image'], '') ||
    pick(playerInfo, ['image', 'image_base64', 'imageBase64'], '') ||
    pick(pd, ['image', 'image_base64', 'imageBase64'], '');
  const imgMime = pick(profileImage, ['image_type', 'mime', 'mime_type'], '') || 'image/jpeg';
  const imgDataUri = imgB64
    ? String(imgB64).startsWith('data:')
      ? String(imgB64)
      : `data:${imgMime};base64,${imgB64}`
    : '';

  const groupObj = pick(regInfo, ['group'], {}) || {};
  const courseObj = pick(regInfo, ['course'], {}) || {};

  const player = {
    id: pick(playerInfo, ['id'], pick(pd, ['player_id', 'playerId'], null)),
    firstName: pick(playerInfo, ['first_eng_name', 'first_name', 'firstName'], ''),
    lastName: pick(playerInfo, ['last_eng_name', 'last_name', 'lastName'], ''),
    fullName:
      [pick(playerInfo, ['first_eng_name'], ''), pick(playerInfo, ['middle_eng_name'], ''), pick(playerInfo, ['last_eng_name'], '')]
        .filter(Boolean)
        .join(' ') ||
      [pick(playerInfo, ['first_ar_name'], ''), pick(playerInfo, ['middle_ar_name'], ''), pick(playerInfo, ['last_ar_name'], '')]
        .filter(Boolean)
        .join(' ') ||
      pick(playerInfo, ['full_name', 'fullName'], ''),
    phone: phone1 || '',
    phone2: phone2 || '',
    imageBase64: imgDataUri,
    imageMime: imgMime,
    academyName: pick(root, ['academy_name'], pick(data, ['academy_name', 'academyName', 'academy.name'], '')),
    academyBadge: pick(data, ['academy.badge', 'academy.badge_base64'], ''),
  };

  const registration = {
    try_out: tryOut,
    try_out_id: tryOut?.id || pick(regInfo, ['try_out_id'], null) || null,
    registration_type: pick(regInfo, ['registration_type'], ''),
    groupName: pick(groupObj, ['group_name', 'name'], pick(regInfo, ['group_name', 'groupName'], '')),
    courseName: pick(courseObj, ['course_name', 'name'], pick(regInfo, ['course_name', 'courseName'], '')),
    level: pick(regInfo, ['level'], ''),
    schedulePreview: toArray(pick(groupObj, ['schedule'], pick(regInfo, ['schedule', 'schedule_preview'], []))),
    startDate: pick(regInfo, ['start_date'], null),
    endDate: pick(regInfo, ['end_date'], null),
    totalSessions: pick(regInfo, ['number_of_sessions', 'num_of_sessions'], 0),
    remainingSessions: pick(root, ['performance_feedback.metrics.remaining_sessions'], 0),
    availableCourses: toArray(pick(regInfo, ['available_courses'], [])),
    availableGroups: toArray(pick(regInfo, ['available_groups'], [])),
    address: pick(regInfo, ['address'], ''),
    google_maps_location: pick(regInfo, ['google_maps_location'], ''),
  };

  const metrics = pick(root, ['performance_feedback.metrics', 'metrics'], {}) || {};
  const credits = pick(metrics, ['credits', 'credit_info'], {}) || {};
  const freeze = {
    current: pick(metrics, ['current_freeze'], null),
    upcoming: pick(metrics, ['upcoming_freeze'], null),
    counts: pick(metrics, ['freezing_counts'], null),
  };

  const performance_feedback = {
    metrics: {
      remaining: pick(metrics, ['remaining_sessions', 'remaining'], registration.remainingSessions || 0),
      total: pick(metrics, ['total_sessions', 'total'], registration.totalSessions || 0),
      credits: {
        totalRemaining: pick(credits, ['total_credit_remaining', 'total_remaining', 'remaining', 'total'], 0),
        nextExpiry: pick(credits, ['next_credit_expiry', 'next_expiry', 'nextExpiry', 'expires_at'], null),
      },
      freeze: {
        current: pick(freeze, ['current'], null),
        upcoming: pick(freeze, ['upcoming'], null),
        counts: pick(freeze, ['counts'], null),
      },
      subscriptionStatus: pick(regInfo, ['subscription_status'], pick(metrics, ['subscription_status', 'subscriptionStatus', 'status'], '')),
      freeze_policy: pick(metrics, ['freeze_policy'], null),
      history: toArray(pick(metrics, ['history', 'freeze_history'], [])),
    },
  };

  const payment_info = toArray(pick(root, ['payment_info', 'payments'], []));
  const subscription_history = toArray(pick(root, ['subscription_history', 'history'], []));

  // Editable profile fields (from player_info)
  const profile = {
    first_eng_name: pick(playerInfo, ['first_eng_name'], ''),
    middle_eng_name: pick(playerInfo, ['middle_eng_name'], ''),
    last_eng_name: pick(playerInfo, ['last_eng_name'], ''),
    first_ar_name: pick(playerInfo, ['first_ar_name'], ''),
    middle_ar_name: pick(playerInfo, ['middle_ar_name'], ''),
    last_ar_name: pick(playerInfo, ['last_ar_name'], ''),
    phone1,
    phone2,
    date_of_birth: pick(playerInfo, ['date_of_birth', 'dob'], ''),
    address: registration.address || '',
    google_maps_location: registration.google_maps_location || '',
    height: pick(healthInfo, ['height'], null),
    weight: pick(healthInfo, ['weight'], null),
  };

  return {
    raw: data,
    player,
    registration,
    performance_feedback,
    payment_info,
    subscription_history,
    health_info: healthInfo,
    player_info: playerInfo,
    profile,
  };
};
