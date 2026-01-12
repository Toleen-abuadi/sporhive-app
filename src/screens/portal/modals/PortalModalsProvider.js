// src/screens/portal/modals/PortalModalsProvider.js
import React, { createContext, useContext, useMemo, useState } from 'react';

import { RequestFreezeModal } from './RequestFreezeModal';
import { RequestRenewalDialog } from './RequestRenewalModal';
import { usePortal } from '../../../services/portal/portal.hooks';

const PortalModalsContext = createContext(null);

export function PortalModalsProvider({ children }) {
  const [renewalOpen, setRenewalOpen] = useState(false);
  const [freezeOpen, setFreezeOpen] = useState(false);
  const { overview } = usePortal();

  const registration = overview?.registration || {};
  const tryOutId = overview?.raw?.registration_info?.try_out_id || overview?.raw?.registration_info?.try_out || null;

  const currentReg = {
    id: registration?.id || null,
    registration_type: registration?.type || '',
    start_date: registration?.startDate || '',
    end_date: registration?.endDate || '',
    number_of_sessions: registration?.sessions || 0,
    group_id: registration?.group?.id || null,
    course_name: registration?.course?.name || '',
    course_id: registration?.course?.id || null,
  };

  const groupOptions = (overview?.available?.groups || []).map((group) => ({
    value: group?.id,
    label: group?.name || 'Group',
    course_id: group?.courseId || null,
    schedule: group?.schedule || [],
  }));

  const courseOptions = (overview?.available?.courses || []).map((course) => ({
    value: course?.id,
    label: course?.name || 'Course',
    start_date: course?.startDate || '',
    end_date: course?.endDate || '',
    num_of_sessions: course?.numSessions || 0,
  }));

  const levels = overview?.levels || [];
  const currentLevel = registration?.level || '';

  const value = useMemo(() => ({
    openRenewal: () => setRenewalOpen(true),
    closeRenewal: () => setRenewalOpen(false),
    openFreeze: () => setFreezeOpen(true),
    closeFreeze: () => setFreezeOpen(false),
  }), []);

  return (
    <PortalModalsContext.Provider value={value}>
      {children}
      <RequestRenewalDialog
        isOpen={renewalOpen}
        onClose={() => setRenewalOpen(false)}
        tryOutId={tryOutId}
        currentReg={currentReg}
        currentLevel={currentLevel}
        levels={levels}
        groupOptions={groupOptions}
        courseOptions={courseOptions}
      />
      <RequestFreezeModal visible={freezeOpen} onClose={() => setFreezeOpen(false)} />
    </PortalModalsContext.Provider>
  );
}

export function usePortalModals() {
  const ctx = useContext(PortalModalsContext);
  if (!ctx) throw new Error('usePortalModals must be used within PortalModalsProvider');
  return ctx;
}
