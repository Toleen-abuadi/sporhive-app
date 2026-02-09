export const portalGlossary = {
  freeze:
    'A freeze pauses your active plan for a short period. Your remaining sessions are preserved, and your end date may shift based on academy policy.',
  renewal:
    'A renewal extends your registration so you can continue training after your current cycle ends.',
  paymentStatus:
    'Payment status shows whether an invoice is unpaid, paid, overdue, or still processing.',
  performance:
    'Performance metrics summarize attendance, recent activity, and progress indicators from your training records.',
  orderStatus:
    'Order status tracks your uniform order from placement to processing, delivery, or collection.',
};

export function getGlossaryHelp(key) {
  return portalGlossary[key] || '';
}
