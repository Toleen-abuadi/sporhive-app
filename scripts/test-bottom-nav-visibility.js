const assert = require('node:assert/strict');
const {
  getActiveTabKey,
  isTabEligible,
  isTabRoot,
} = require('../src/navigation/tabRoots');

const cases = [
  { path: '/(app)/services', visible: true, activeKey: 'home' },
  { path: '/academies', visible: true, activeKey: 'discover' },
  { path: '/playgrounds/explore', visible: true, activeKey: 'book' },
  { path: '/playgrounds/bookings', visible: true, activeKey: 'book' },
  { path: '/portal/home', visible: true, activeKey: 'portal' },
  { path: '/portal/more', visible: true, activeKey: 'portal' },
  { path: '/portal/renewals', visible: true, activeKey: 'portal' },
  { path: '/portal/profile', visible: true, activeKey: 'profile' },
  { path: '/portal/profile/edit', visible: false, activeKey: null },
  { path: '/portal/payments/INV-1', visible: false, activeKey: null },
  { path: '/portal/orders/ORDER-1', visible: false, activeKey: null },
  { path: '/portal/order/ORDER-1', visible: false, activeKey: null },
  { path: '/portal/payment/INV-1', visible: false, activeKey: null },
  { path: '/portal/renewals/details', visible: false, activeKey: null },
  { path: '/playgrounds/venue/123', visible: false, activeKey: null },
  { path: '/playgrounds/book/123', visible: false, activeKey: null },
  { path: '/(auth)/login', visible: false, activeKey: null },
];

cases.forEach(({ path, visible, activeKey }) => {
  assert.equal(isTabEligible(path), visible, `visibility mismatch for ${path}`);
  assert.equal(getActiveTabKey(path), activeKey, `active tab mismatch for ${path}`);
});

assert.equal(isTabRoot('/portal/home?foo=1'), true, 'tab roots should ignore query strings');

console.log(`bottom-nav visibility smoke tests passed (${cases.length} cases)`);
