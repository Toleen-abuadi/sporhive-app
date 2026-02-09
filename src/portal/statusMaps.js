const normalize = (value) => String(value || '').trim().toLowerCase();

const DEFAULT_STATUS = {
  label: 'Unknown',
  severity: 'neutral',
  icon: 'Info',
  shortHelp: 'Status update is not available yet.',
};

const makeMap = (entries) =>
  Object.fromEntries(
    Object.entries(entries).map(([key, value]) => [normalize(key), value])
  );

const paymentMap = makeMap({
  paid: { label: 'Paid', severity: 'success', icon: 'CircleCheck', shortHelp: 'Payment completed successfully.' },
  unpaid: { label: 'Unpaid', severity: 'warning', icon: 'CircleAlert', shortHelp: 'Payment is still pending.' },
  overdue: { label: 'Overdue', severity: 'danger', icon: 'AlertTriangle', shortHelp: 'Payment is past due date and needs action.' },
  pending: { label: 'Pending', severity: 'warning', icon: 'Clock3', shortHelp: 'Payment is waiting for confirmation.' },
  processing: { label: 'Processing', severity: 'info', icon: 'LoaderCircle', shortHelp: 'Payment is being processed.' },
});

const renewalMap = makeMap({
  eligible: { label: 'Eligible', severity: 'success', icon: 'BadgeCheck', shortHelp: 'You can renew now.' },
  ineligible: { label: 'Not eligible', severity: 'danger', icon: 'CircleX', shortHelp: 'Renewal cannot be submitted right now.' },
  pending: { label: 'Pending', severity: 'warning', icon: 'Clock3', shortHelp: 'Renewal request is under review.' },
  approved: { label: 'Approved', severity: 'success', icon: 'CircleCheck', shortHelp: 'Renewal has been approved.' },
  rejected: { label: 'Rejected', severity: 'danger', icon: 'CircleX', shortHelp: 'Renewal request was rejected.' },
});

const freezeMap = makeMap({
  active: { label: 'Freeze active', severity: 'warning', icon: 'PauseCircle', shortHelp: 'Your subscription is currently paused.' },
  upcoming: { label: 'Freeze scheduled', severity: 'info', icon: 'CalendarClock', shortHelp: 'Freeze will begin on the selected date.' },
  pending: { label: 'Freeze pending', severity: 'warning', icon: 'Clock3', shortHelp: 'Freeze request is waiting for approval.' },
  approved: { label: 'Approved', severity: 'success', icon: 'CircleCheck', shortHelp: 'Freeze request has been approved.' },
  rejected: { label: 'Rejected', severity: 'danger', icon: 'CircleX', shortHelp: 'Freeze request was rejected.' },
});

const orderMap = makeMap({
  pending: { label: 'Pending', severity: 'warning', icon: 'Clock3', shortHelp: 'Order is received and awaiting processing.' },
  processing: { label: 'Processing', severity: 'info', icon: 'Package', shortHelp: 'Order is being prepared.' },
  delivered: { label: 'Delivered', severity: 'success', icon: 'Truck', shortHelp: 'Order has been delivered.' },
  collected: { label: 'Collected', severity: 'success', icon: 'PackageCheck', shortHelp: 'Order has been collected.' },
  cancelled: { label: 'Cancelled', severity: 'danger', icon: 'Ban', shortHelp: 'Order was cancelled.' },
});

export function getMappedStatus(domain, rawStatus) {
  const maps = { payment: paymentMap, renewal: renewalMap, freeze: freezeMap, order: orderMap };
  const status = normalize(rawStatus);
  return maps[domain]?.[status] || { ...DEFAULT_STATUS, label: rawStatus || DEFAULT_STATUS.label };
}
