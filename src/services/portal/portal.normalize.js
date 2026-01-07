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
  const data = raw?.data ?? raw; // your apiClient may already return response.data

  const player = {
    id: pick(data, ['player.id', 'player_id', 'profile.player_id'], null),
    firstName: pick(data, ['player.first_name', 'player.firstName', 'first_name'], ''),
    lastName: pick(data, ['player.last_name', 'player.lastName', 'last_name'], ''),
    fullName:
      pick(data, ['player.full_name', 'player.fullName', 'full_name'], '') ||
      `${safeStr(pick(data, ['player.first_name', 'first_name'], ''))} ${safeStr(
        pick(data, ['player.last_name', 'last_name'], '')
      )}`.trim(),
    phone: pick(data, ['player.phone', 'phone', 'player.phone_number'], ''),
    phone2: pick(data, ['player.phone2', 'phone2', 'player.alt_phone'], ''),
    imageBase64: pick(data, ['player.image', 'player.image_base64', 'player.imageBase64'], ''),
    academyName: pick(data, ['academy.name', 'academy_name', 'academyName'], ''),
    academyBadge: pick(data, ['academy.badge', 'academy.badge_base64'], ''),
  };

  const registration = {
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
        current: pick(freeze, ['current', 'active'], null),
        upcoming: pick(freeze, ['upcoming', 'scheduled'], null),
        counts: pick(freeze, ['counts', 'summary'], null),
      },
      subscriptionStatus: pick(metrics, ['subscription_status', 'subscriptionStatus', 'status'], ''),
    },
  };

  const payment_info = toArray(pick(data, ['payment_info', 'payments'], []));
  const subscription_history = toArray(pick(data, ['subscription_history', 'history'], []));
  const health_info = pick(data, ['health_info', 'health'], {}) || {};

  return {
    raw: data,
    player,
    registration,
    performance_feedback,
    payment_info,
    subscription_history,
    health_info,
  };
};
