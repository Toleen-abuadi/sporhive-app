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
  const data = raw?.data ?? raw;

  const playerInfo = pick(data, ['player_info', 'profile.player_info', 'playerInfo'], {}) || {};
  const regInfo = pick(data, ['registration_info', 'current_reg', 'registration'], {}) || {};
  const healthInfo = pick(data, ['health_info', 'health'], {}) || {};

  const tryOut =
    pick(data, ['registration_info.try_out', 'try_out', 'player.try_out'], null) ||
    (pick(data, ['try_out_id', 'registration_info.try_out_id'], null)
      ? { id: pick(data, ['try_out_id', 'registration_info.try_out_id'], null) }
      : null);

  const player = {
    id: pick(data, ['player.id', 'player_id', 'profile.player_id', 'playerInfo.id'], null),
    firstName: pick(data, ['player.first_name', 'player.firstName', 'first_name', 'playerInfo.first_name'], ''),
    lastName: pick(data, ['player.last_name', 'player.lastName', 'last_name', 'playerInfo.last_name'], ''),
    fullName:
      pick(data, ['player.full_name', 'player.fullName', 'full_name'], '') ||
      `${safeStr(pick(data, ['player.first_name', 'first_name'], ''))} ${safeStr(
        pick(data, ['player.last_name', 'last_name'], '')
      )}`.trim(),
    phone: pick(data, ['player.phone', 'phone', 'player.phone_number', 'playerInfo.phone'], ''),
    phone2: pick(data, ['player.phone2', 'phone2', 'player.alt_phone', 'playerInfo.phone2'], ''),
    imageBase64: pick(data, ['player.image', 'player.image_base64', 'player.imageBase64', 'playerInfo.image'], ''),
    academyName: pick(data, ['academy.name', 'academy_name', 'academyName'], ''),
    academyBadge: pick(data, ['academy.badge', 'academy.badge_base64'], ''),
  };

  const registration = {
    try_out: tryOut,
    groupName: pick(data, ['registration_info.group_name', 'registration.group_name', 'current_reg.group'], ''),
    courseName: pick(data, ['registration_info.course_name', 'registration.course_name', 'current_reg.course'], ''),
    level: pick(data, ['registration_info.level', 'current_reg.level', 'level'], ''),
    schedulePreview: toArray(
      pick(data, ['registration_info.schedule', 'registration_info.schedule_preview', 'current_reg.schedule'], [])
    ),
    startDate: pick(data, ['registration_info.start_date', 'current_reg.start_date', 'start_date'], null),
    endDate: pick(data, ['registration_info.end_date', 'current_reg.end_date', 'end_date'], null),
    totalSessions: pick(data, ['registration_info.number_of_sessions', 'sessions.total', 'total_sessions'], 0),
    remainingSessions: pick(
      data,
      ['performance_feedback.metrics.remaining', 'sessions.remaining', 'remaining_sessions'],
      0
    ),
    availableCourses: toArray(pick(data, ['registration_info.available_courses', 'available_courses'], [])),
    availableGroups: toArray(pick(data, ['registration_info.available_groups', 'available_groups'], [])),
    address: pick(data, ['registration_info.address', 'address'], ''),
    google_maps_location: pick(data, ['registration_info.google_maps_location', 'google_maps_location'], ''),
  };

  const metrics = pick(data, ['performance_feedback.metrics', 'metrics'], {}) || {};
  const credits = pick(metrics, ['credits', 'credit_info'], {}) || {};
  const freeze = pick(metrics, ['freeze', 'freeze_info'], {}) || {};

  const performance_feedback = {
    metrics: {
      remaining: pick(metrics, ['remaining', 'remaining_sessions'], registration.remainingSessions || 0),
      total: pick(metrics, ['total', 'total_sessions'], registration.totalSessions || 0),
      credits: {
        totalRemaining: pick(credits, ['total_remaining', 'remaining', 'total'], 0),
        nextExpiry: pick(credits, ['next_expiry', 'nextExpiry', 'expires_at'], null),
      },
      freeze: {
        current: pick(freeze, ['current', 'active', 'current_freeze'], null),
        upcoming: pick(freeze, ['upcoming', 'scheduled', 'upcoming_freeze'], null),
        counts: pick(freeze, ['counts', 'summary'], null),
      },
      subscriptionStatus: pick(metrics, ['subscription_status', 'subscriptionStatus', 'status'], ''),
      freeze_policy: pick(metrics, ['freeze_policy'], null),
      history: toArray(pick(metrics, ['history', 'freeze_history'], [])),
    },
  };

  const payment_info = toArray(pick(data, ['payment_info', 'payments'], []));
  const subscription_history = toArray(pick(data, ['subscription_history', 'history'], []));

  // Editable profile fields (from player_info)
  const profile = {
    first_eng_name: pick(playerInfo, ['first_eng_name'], ''),
    middle_eng_name: pick(playerInfo, ['middle_eng_name'], ''),
    last_eng_name: pick(playerInfo, ['last_eng_name'], ''),
    first_ar_name: pick(playerInfo, ['first_ar_name'], ''),
    middle_ar_name: pick(playerInfo, ['middle_ar_name'], ''),
    last_ar_name: pick(playerInfo, ['last_ar_name'], ''),
    phone1: pick(playerInfo, ['phone_number_1', 'phone1', 'phone'], ''),
    phone2: pick(playerInfo, ['phone_number_2', 'phone2'], ''),
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
