// src/screens/portal/SupportScreen.js
import React, { useMemo } from 'react';
import { FlatList, RefreshControl } from 'react-native';

import { usePortal, usePortalRefresh } from '../../services/portal/portal.hooks';
import { PortalCard, PortalEmptyState, PortalHeader, PortalRow, PortalScreen } from '../../components/portal/PortalPrimitives';
import { spacing } from '../../theme/portal.styles';

export default function SupportScreen() {
  const { overview } = usePortal();
  const { refreshing, onRefresh } = usePortalRefresh();

  const contactRows = useMemo(() => {
    const rows = [];
    const player = overview?.player || {};
    const group = overview?.registration?.group || {};

    if (player.email) rows.push({ title: 'Email', value: player.email });
    if (Array.isArray(player.phoneNumbers)) {
      player.phoneNumbers.forEach((phone, idx) => {
        rows.push({ title: `Phone ${idx + 1}`, value: phone });
      });
    }
    if (group.whatsappUrl) rows.push({ title: 'WhatsApp', value: group.whatsappUrl });

    return rows;
  }, [overview]);

  return (
    <PortalScreen>
      <PortalHeader title="Support" subtitle={overview?.academyName || ''} />
      {!overview ? (
        <PortalEmptyState
          title="No support data"
          message="Pull to refresh to load your support info."
          action={onRefresh}
          actionLabel="Refresh"
        />
      ) : (
        <FlatList
          data={[{ id: 'support' }]}
          keyExtractor={(item) => item.id}
          renderItem={() => (
            <PortalCard title="Contact" subtitle="Reach the academy for help">
              {contactRows.length ? (
                contactRows.map((row, idx) => (
                  <PortalRow key={`${row.title}-${idx}`} title={row.title} value={row.value} />
                ))
              ) : (
                <PortalEmptyState
                  title="No contact info"
                  message="No support contact details are available in your profile."
                />
              )}
            </PortalCard>
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F97316" />}
          contentContainerStyle={{ padding: spacing.screenPadding, paddingBottom: 120 }}
        />
      )}
    </PortalScreen>
  );
}
