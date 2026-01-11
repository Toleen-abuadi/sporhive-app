// src/services/portal/portal.normalize.js
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

const toArray = (value) => (Array.isArray(value) ? value : value ? [value] : []);

export const safeNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

export const formatDate = (value, fallback = '—') => {
  if (!value) return fallback;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? fallback : d.toLocaleDateString();
};

export const formatMoney = (value, currency = 'SAR') => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n);
  } catch {
    return n.toFixed(2);
  }
};

const normalizeScheduleItem = (item) => {
  if (!item) return null;
  if (typeof item === 'string') return { label: item };
  const day = item.day || item.week_day || item.weekday || item.label || '';
  const start = item.start || item.start_time || item.from || item.time?.start || '';
  const end = item.end || item.end_time || item.to || item.time?.end || '';
  const time = [start, end].filter(Boolean).join(' - ');
  return {
    ...item,
    day,
    start,
    end,
    time,
    label: `${day} ${time}`.trim(),
  };
};

const normalizeAvatar = (profileImage = {}, playerInfo = {}) => {
  const base64 = pick(profileImage, ['image', 'image_base64', 'base64'], '') || pick(playerInfo, ['profile_image', 'image'], '');
  const mime = pick(profileImage, ['image_type', 'mime', 'type'], 'image/png');
  if (base64) {
    return { uri: `data:${mime};base64,${base64}`, mime };
  }
  const uri = pick(profileImage, ['uri', 'url'], '') || pick(playerInfo, ['image_url', 'avatar_url'], '');
  return uri ? { uri, mime } : { uri: '', mime };
};

const normalizePhones = (playerInfo = {}) => {
  const phoneDict = pick(playerInfo, ['phone_numbers', 'phones'], {});
  const list = Array.isArray(phoneDict)
    ? phoneDict
    : phoneDict && typeof phoneDict === 'object'
      ? Object.values(phoneDict)
      : [];
  const fallback = [
    pick(playerInfo, ['phone_number_1', 'phone1', 'phone'], null),
    pick(playerInfo, ['phone_number_2', 'phone2'], null),
  ].filter(Boolean);
  return [...list, ...fallback].filter(Boolean).map((v) => String(v));
};

export const normalizePortalOverview = (raw) => {
  const root = raw?.data?.player_data ? raw.data : raw;
  const data = root?.player_data || root || {};

  const playerInfo = pick(data, ['player_info'], {}) || {};
  const registrationInfo = pick(data, ['registration_info'], {}) || {};
  const healthInfo = pick(data, ['health_info'], {}) || {};
  const profileImage = pick(data, ['profile_image'], {}) || {};

  const academyName = pick(data, ['academy_name', 'academy.name'], '') || '';

  const fullNameEn = [
    pick(playerInfo, ['first_eng_name'], ''),
    pick(playerInfo, ['middle_eng_name'], ''),
    pick(playerInfo, ['last_eng_name'], ''),
  ]
    .filter(Boolean)
    .join(' ') || pick(playerInfo, ['full_name_en', 'full_name', 'full_eng_name'], '');

  const fullNameAr = [
    pick(playerInfo, ['first_ar_name'], ''),
    pick(playerInfo, ['middle_ar_name'], ''),
    pick(playerInfo, ['last_ar_name'], ''),
  ]
    .filter(Boolean)
    .join(' ') || pick(playerInfo, ['full_name_ar', 'full_ar_name'], '');

  const player = {
    id: pick(playerInfo, ['id', 'player_id'], null),
    fullNameEn: fullNameEn || '',
    fullNameAr: fullNameAr || '',
    phoneNumbers: normalizePhones(playerInfo),
    email: pick(playerInfo, ['email', 'email_address'], ''),
    dob: pick(playerInfo, ['date_of_birth', 'dob'], ''),
    createdAt: pick(playerInfo, ['created_at', 'createdAt'], ''),
    avatar: normalizeAvatar(profileImage, playerInfo),
  };

  const group = registrationInfo?.group || {};
  const course = registrationInfo?.course || {};

  const registration = {
    id: pick(registrationInfo, ['id', 'registration_id', 'try_out_id', 'try_out'], null),
    type: pick(registrationInfo, ['registration_type', 'type'], ''),
    level: pick(registrationInfo, ['level', 'level_name'], ''),
    startDate: pick(registrationInfo, ['start_date', 'startDate'], ''),
    endDate: pick(registrationInfo, ['end_date', 'endDate'], ''),
    sessions: safeNumber(pick(registrationInfo, ['number_of_sessions', 'sessions', 'session_count'], 0), 0),
    group: {
      id: pick(group, ['id', 'group_id'], null),
      name: pick(group, ['group_name', 'name'], ''),
      whatsappUrl: pick(group, ['whatsapp_url', 'whatsapp', 'whatsapp_link'], ''),
      maxPlayers: safeNumber(pick(group, ['max_players', 'capacity'], null), null),
      sessionsPerWeek: safeNumber(pick(group, ['sessions_per_week'], null), null),
      schedule: toArray(pick(group, ['schedule', 'sessions_schedule'], [])).map(normalizeScheduleItem).filter(Boolean),
      courseId: pick(group, ['course_id', 'course.id'], null),
    },
    course: {
      id: pick(course, ['id', 'course_id'], null),
      name: pick(course, ['course_name', 'name'], ''),
      startDate: pick(course, ['start_date', 'startDate'], ''),
      endDate: pick(course, ['end_date', 'endDate'], ''),
      numSessions: safeNumber(pick(course, ['number_of_sessions', 'sessions'], 0), 0),
      totalPrice: safeNumber(pick(course, ['total_price', 'price', 'amount'], 0), 0),
    },
  };

  const available = {
    courses: toArray(pick(registrationInfo, ['available_courses'], [])).map((item) => ({
      id: pick(item, ['id', 'course_id'], null),
      name: pick(item, ['course_name', 'name'], ''),
      startDate: pick(item, ['start_date', 'startDate'], ''),
      endDate: pick(item, ['end_date', 'endDate'], ''),
      numSessions: safeNumber(pick(item, ['number_of_sessions', 'sessions'], 0), 0),
      totalPrice: safeNumber(pick(item, ['total_price', 'price', 'amount'], 0), 0),
      raw: item,
    })),
    groups: toArray(pick(registrationInfo, ['available_groups'], [])).map((item) => ({
      id: pick(item, ['id', 'group_id'], null),
      name: pick(item, ['group_name', 'name'], ''),
      whatsappUrl: pick(item, ['whatsapp_url', 'whatsapp'], ''),
      maxPlayers: safeNumber(pick(item, ['max_players', 'capacity'], null), null),
      sessionsPerWeek: safeNumber(pick(item, ['sessions_per_week'], null), null),
      courseId: pick(item, ['course_id', 'course.id'], null),
      schedule: toArray(pick(item, ['schedule'], [])).map(normalizeScheduleItem).filter(Boolean),
      raw: item,
    })),
  };

  const payments = toArray(pick(data, ['payment_info'], [])).map((item) => ({
    id: pick(item, ['id', 'payment_id', 'invoice_id'], null),
    type: pick(item, ['type', 'payment_type'], ''),
    subType: pick(item, ['sub_type', 'subtype', 'sub_type_name'], ''),
    status: pick(item, ['status', 'payment_status'], ''),
    amount: safeNumber(pick(item, ['amount', 'total', 'value'], 0), 0),
    dueDate: pick(item, ['due_date', 'dueDate'], ''),
    paymentMethod: pick(item, ['payment_method', 'method'], ''),
    paidOn: pick(item, ['paid_on', 'paid_at'], ''),
    invoiceId: pick(item, ['invoice_id', 'invoiceId'], ''),
    fees: pick(item, ['fee_breakdown', 'fees'], {}) || {},
    raw: item,
  }));

  const subscriptionHistory = toArray(pick(data, ['subscription_history'], [])).map((item) => ({
    id: pick(item, ['id', 'history_id'], null),
    startDate: pick(item, ['start_date', 'startDate'], ''),
    endDate: pick(item, ['end_date', 'endDate'], ''),
    sessions: safeNumber(pick(item, ['number_of_sessions', 'sessions'], 0), 0),
    oldValue: pick(item, ['log.old_value', 'old_value', 'oldValue'], null),
    updateData: pick(item, ['log.update_data', 'update_data', 'updateData'], null),
    raw: item,
  }));

  const health = {
    height: pick(healthInfo, ['height', 'height_cm'], null),
    weight: pick(healthInfo, ['weight', 'weight_kg'], null),
    timestamp: pick(healthInfo, ['timestamp', 'updated_at', 'created_at'], ''),
  };

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
    available,
    payments,
    subscriptionHistory,
    health,
    credits,
    performance,
    levels,
    raw: data,
  };
};
