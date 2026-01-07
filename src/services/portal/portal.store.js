// src/services/portal/portal.store.js
// Lightweight in-memory store for Portal module (no external deps).
// Keeps the latest normalized overview payload and lets screens subscribe for instant UI hydration.

const _state = {
  overview: null,
  updatedAt: 0,
};

const _subs = new Set();

const _emit = () => {
  for (const fn of _subs) {
    try { fn(_state); } catch (e) {}
  }
};

export const portalStore = {
  getState() {
    return _state;
  },

  subscribe(fn) {
    _subs.add(fn);
    return () => _subs.delete(fn);
  },

  setOverview({ normalized }) {
    _state.overview = normalized || null;
    _state.updatedAt = Date.now();
    _emit();
  },

  clear() {
    _state.overview = null;
    _state.updatedAt = 0;
    _emit();
  },
};
