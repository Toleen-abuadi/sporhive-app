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

export const normalizePortalOverview = (data) => {
  if (!data) return null;

  const playerData = data.player_data || {};
  const playerInfo = playerData.player_info || {};
  const registrationInfo = playerData.registration_info || {};
  const healthInfo = playerData.health_info || {};
  const profileImage = playerData.profile_image || {};
  const paymentInfo = playerData.payment_info || [];
  const subscriptionHistory = playerData.subscription_history || [];
  const credits = playerData.credits || {};
  const performance = playerData.performance_feedback || {};

  // Extract phone numbers safely
  const phoneNumbers = playerInfo.phone_numbers || {};

  // Create player object
  const player = {
    id: playerInfo.id,
    fullName: `${playerInfo.first_eng_name || ''} ${playerInfo.last_eng_name || ''}`.trim() ||
      `${playerInfo.first_ar_name || ''} ${playerInfo.last_ar_name || ''}`.trim(),
    firstEngName: playerInfo.first_eng_name || '',
    middleEngName: playerInfo.middle_eng_name || '',
    lastEngName: playerInfo.last_eng_name || '',
    firstArName: playerInfo.first_ar_name || '',
    middleArName: playerInfo.middle_ar_name || '',
    lastArName: playerInfo.last_ar_name || '',
    phone: phoneNumbers['1'] || '',
    phone2: phoneNumbers['2'] || '',
    dateOfBirth: playerInfo.date_of_birth || '',
    email: playerInfo.email || '',
    createdAt: playerInfo.created_at || '',
    imageBase64: profileImage.image || null,
    imageType: profileImage.image_type || null,
    imageSize: profileImage.image_size || 0,
  };

  // Create registration object
  const registration = {
    id: registrationInfo.id,
    registrationType: registrationInfo.registration_type || '',
    level: registrationInfo.level || '',
    startDate: registrationInfo.start_date || '',
    endDate: registrationInfo.end_date || '',
    numberOfSessions: registrationInfo.number_of_sessions || 0,
    totalSessions: registrationInfo.number_of_sessions || 0,
    remainingSessions: performance?.metrics?.remaining_sessions || 0,
    address: registrationInfo.address || '',
    groupName: registrationInfo.group?.group_name || '',
    courseName: registrationInfo.course?.course_name || '',
    group: registrationInfo.group || {},
    course: registrationInfo.course || {},
    availableCourses: registrationInfo.available_courses || [],
    availableGroups: registrationInfo.available_groups || [],
    googleMapsLocation: registrationInfo.google_maps_location || '',
  };

  // Create payments array with proper formatting
  const payments = paymentInfo.map(payment => ({
    id: payment.id,
    type: payment.type || '',
    subType: payment.sub_type || '',
    status: payment.status || 'pending',
    amount: payment.amount || '0',
    dueDate: payment.due_date || '',
    paymentMethod: payment.payment_method || '',
    paidOn: payment.paid_on || '',
    invoiceId: payment.invoice_id || null,
    fees: payment.fees || {},
  }));

  // Create health object
  const health = {
    height: healthInfo.height || null,
    weight: healthInfo.weight || null,
    timestamp: healthInfo.timestamp || '',
  };

  return {
    player,
    registration,
    payments,
    health,
    subscriptionHistory,
    credits,
    performance,
    academyName: data.academy_name || '',
    levels: data.levels || [],
    // Raw data for debugging
    _raw: data,
  };
};