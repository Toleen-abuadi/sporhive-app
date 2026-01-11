// src/screens/portal/modals/PortalModalsProvider.js
import React, { createContext, useContext, useMemo, useState } from 'react';

import { RequestFreezeModal } from './RequestFreezeModal';
import { RequestRenewalModal } from './RequestRenewalModal';

const PortalModalsContext = createContext(null);

export function PortalModalsProvider({ children }) {
  const [renewalOpen, setRenewalOpen] = useState(false);
  const [freezeOpen, setFreezeOpen] = useState(false);

  const value = useMemo(() => ({
    openRenewal: () => setRenewalOpen(true),
    closeRenewal: () => setRenewalOpen(false),
    openFreeze: () => setFreezeOpen(true),
    closeFreeze: () => setFreezeOpen(false),
  }), []);

  return (
    <PortalModalsContext.Provider value={value}>
      {children}
      <RequestRenewalModal visible={renewalOpen} onClose={() => setRenewalOpen(false)} />
      <RequestFreezeModal visible={freezeOpen} onClose={() => setFreezeOpen(false)} />
    </PortalModalsContext.Provider>
  );
}

export function usePortalModals() {
  const ctx = useContext(PortalModalsContext);
  if (!ctx) throw new Error('usePortalModals must be used within PortalModalsProvider');
  return ctx;
}
