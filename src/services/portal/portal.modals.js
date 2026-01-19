import React, { createContext, useContext, useMemo } from 'react';

const PortalModalsContext = createContext(null);

export function PortalModalsProvider({ children }) {
  const value = useMemo(() => ({}), []);
  return <PortalModalsContext.Provider value={value}>{children}</PortalModalsContext.Provider>;
}

export function usePortalModals() {
  const ctx = useContext(PortalModalsContext);
  if (!ctx) {
    throw new Error('usePortalModals must be used within a PortalModalsProvider');
  }
  return ctx;
}
