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
const formatSchedule = (item) => {
  if (!item) return '';
  if (typeof item === 'string') return item;
  const day = item?.day || '';
  const timeValue = item?.time || item?.hours || null;
  let time = '';
  if (typeof timeValue === 'string') {
    time = timeValue;
  } else if (timeValue && typeof timeValue === 'object') {
    time = [timeValue.start, timeValue.end].filter(Boolean).join(' - ');
  } else if (item?.start || item?.end) {
    time = [item.start, item.end].filter(Boolean).join(' - ');
  }
  return `${day} ${time}`.trim();
};

export const normalizePortalOverview = (raw) => {
  const root = raw?.data ?? raw;
  const data = root?.player_data ?? root;

  const playerInfo = pick(data, ['player_info', 'profile.player_info', 'playerInfo'], {}) || {};
  const regInfo = pick(data, ['registration_info', 'current_reg', 'registration'], {}) || {};
  const healthInfo = pick(data, ['health_info', 'health'], {}) || {};
  const profileImage = pick(data, ['profile_image', 'player.profile_image', 'profileImage'], {}) || {};
  const phoneNumbers = pick(playerInfo, ['phone_numbers', 'phones'], {}) || {};
  const phone1 =
    pick(playerInfo, ['phone_number_1', 'phone1', 'phone'], '') ||
    phoneNumbers?.['1'] ||
    phoneNumbers?.[1] ||
    '';
  const phone2 =
    pick(playerInfo, ['phone_number_2', 'phone2'], '') ||
    phoneNumbers?.['2'] ||
    phoneNumbers?.[2] ||
    '';

  const tryOut =
    pick(data, ['registration_info.try_out', 'try_out', 'player.try_out'], null) ||
    (pick(data, ['try_out_id', 'registration_info.try_out_id'], null)
      ? { id: pick(data, ['try_out_id', 'registration_info.try_out_id'], null) }
      : null);

  const player = {
    id: pick(data, ['player.id', 'player_id', 'profile.player_id', 'playerInfo.id', 'player_info.id'], null),
    firstName: pick(data, ['player.first_name', 'player.firstName', 'first_name', 'playerInfo.first_name', 'player_info.first_eng_name'], ''),
    lastName: pick(data, ['player.last_name', 'player.lastName', 'last_name', 'playerInfo.last_name', 'player_info.last_eng_name'], ''),
    fullName:
      pick(data, ['player.full_name', 'player.fullName', 'full_name'], '') ||
      `${safeStr(pick(data, ['player.first_name', 'first_name', 'player_info.first_eng_name'], ''))} ${safeStr(
        pick(data, ['player.last_name', 'last_name', 'player_info.last_eng_name'], '')
      )}`.trim(),
    phone: pick(data, ['player.phone', 'phone', 'player.phone_number', 'playerInfo.phone'], '') || phone1,
    phone2: pick(data, ['player.phone2', 'phone2', 'player.alt_phone', 'playerInfo.phone2'], '') || phone2,
    imageBase64:
      pick(data, ['player.image', 'player.image_base64', 'player.imageBase64', 'playerInfo.image'], '') ||
      pick(profileImage, ['image', 'image_base64', 'imageBase64'], ''),
    image:
      pick(data, ['player.image', 'player.image_base64', 'player.imageBase64', 'playerInfo.image'], '') ||
      pick(profileImage, ['image', 'image_base64', 'imageBase64'], ''),
    academyName:
      pick(rawRoot, ['academy.name', 'academy_name', 'academyName'], '') ||
      pick(root, ['academy.name', 'academy_name', 'academyName'], ''),
    academyBadge: pick(data, ['academy.badge', 'academy.badge_base64'], ''),
  };

  const group = regInfo?.group || {};
  const course = regInfo?.course || {};
  const schedulePreview = toArray(
    pick(regInfo, ['schedule', 'schedule_preview'], []) ||
      pick(group, ['schedule'], [])
  ).map((item) => {
    if (typeof item === 'string') return item;
    const formatted = formatSchedule(item);
    const time = item?.day ? formatted.replace(`${item.day} `, '') : formatted;
    return {
      ...item,
      time,
    };
  });

  const registration = {
    try_out: tryOut,
    groupName: pick(data, ['registration_info.group_name', 'registration.group_name', 'current_reg.group'], '') || group?.group_name || group?.name || '',
    courseName: pick(data, ['registration_info.course_name', 'registration.course_name', 'current_reg.course'], '') || course?.course_name || course?.name || '',
    level: pick(data, ['registration_info.level', 'current_reg.level', 'level'], ''),
    schedulePreview,
    startDate: pick(data, ['registration_info.start_date', 'current_reg.start_date', 'start_date'], null),
    endDate: pick(data, ['registration_info.end_date', 'current_reg.end_date', 'end_date'], null),
    totalSessions: pick(data, ['registration_info.number_of_sessions', 'sessions.total', 'total_sessions'], 0),
    remainingSessions: pick(
      data,
      ['performance_feedback.metrics.remaining', 'sessions.remaining', 'remaining_sessions'],
      0
    ),
    availableCourses: toArray(pick(data, ['registration_info.available_courses', 'available_courses'], [])),
    availableGroups: toArray(pick(data, ['registration_info.available_groups', 'available_groups'], [])).map((g) => {
      const scheduleText = Array.isArray(g?.schedule)
        ? g.schedule.map((s) => formatSchedule(s)).filter(Boolean).join(', ')
        : g?.schedule || '';
      return {
        ...g,
        schedule: scheduleText,
      };
    }),
    address: pick(data, ['registration_info.address', 'address'], ''),
    google_maps_location: pick(data, ['registration_info.google_maps_location', 'google_maps_location'], ''),
  };

  const metrics = pick(data, ['performance_feedback.metrics', 'metrics'], {}) || {};
  const credits = pick(metrics, ['credits', 'credit_info'], {}) || {};
  const freeze = pick(metrics, ['freeze', 'freeze_info'], {}) || {};
  const freezeCounts = pick(metrics, ['freezing_counts'], null);
  const currentFreeze = pick(metrics, ['current_freeze'], null);
  const upcomingFreeze = pick(metrics, ['upcoming_freeze'], null);
  const rawSubscriptionStatus = pick(regInfo, ['subscription_status', 'subscriptionStatus'], '');
  const subscriptionStatus =
    typeof rawSubscriptionStatus === 'boolean'
      ? rawSubscriptionStatus
        ? 'Active'
        : 'Inactive'
      : rawSubscriptionStatus;

  const performance_feedback = {
    metrics: {
      remaining: pick(metrics, ['remaining', 'remaining_sessions'], registration.remainingSessions || 0),
      total: pick(metrics, ['total', 'total_sessions'], registration.totalSessions || 0),
      credits: {
        totalRemaining: pick(credits, ['total_remaining', 'remaining', 'total', 'total_credit_remaining'], 0),
        nextExpiry: pick(credits, ['next_expiry', 'nextExpiry', 'expires_at', 'next_credit_expiry'], null),
      },
      freeze: {
        current: pick(freeze, ['current', 'active', 'current_freeze'], null) || currentFreeze,
        upcoming: pick(freeze, ['upcoming', 'scheduled', 'upcoming_freeze'], null) || upcomingFreeze,
        counts: pick(freeze, ['counts', 'summary', 'freezing_counts'], null) || freezeCounts,
      },
      subscriptionStatus: pick(metrics, ['subscription_status', 'subscriptionStatus', 'status'], '') || subscriptionStatus,
      freeze_policy: pick(metrics, ['freeze_policy'], null),
      history: toArray(pick(metrics, ['history', 'freeze_history'], [])),
    },
  };

  const payment_info = toArray(pick(data, ['payment_info', 'payments'], [])).map((p) => ({
    ...p,
    fee_breakdown: p?.fee_breakdown || p?.fees || null,
  }));

  const subscription_history = toArray(pick(data, ['subscription_history', 'history'], [])).map((item) => {
    const log = item?.log || {};
    const oldValue = log?.old_value || {};
    const updateData = log?.update_data || {};
    const groupName = oldValue?.group?.group_name || oldValue?.group_name || item?.group_name || '';
    const courseName = oldValue?.course?.course_name || oldValue?.course_name || item?.course_name || '';
    const sessions = item?.number_of_sessions || updateData?.number_of_sessions || oldValue?.number_of_sessions || item?.sessions;
    const status = item?.status || updateData?.registration_type || oldValue?.registration_type || item?.type || '';
    const logSummary = log?.summary || (log?.action ? String(log.action) : '');

    return {
      ...item,
      course_name: courseName,
      group_name: groupName,
      sessions,
      status,
      log: logSummary || (log && Object.keys(log).length ? JSON.stringify(log) : item?.log),
    };
  });

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
    raw: root,
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
