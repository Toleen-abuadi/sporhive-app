// src/screens/portal/TrainingInfoScreen.js
import React, { useMemo } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { usePortal, usePortalRefresh } from '../../services/portal/portal.hooks';
import { formatDate } from '../../services/portal/portal.normalize';
import { portalStyles } from '../../theme/portal.styles';
import { Card, PortalHeader, PortalScreen, PortalEmptyState } from '../../components/portal/PortalPrimitives';

const ProgressBar = React.memo(function ProgressBar({ value = 0, max = 1 }) {
  const pct = Math.max(0, Math.min(1, max ? value / max : 0));
  return (
    <View style={portalStyles.progressTrack}>
      <View style={[portalStyles.progressFill, { width: `${pct * 100}%` }]} />
    </View>
  );
});

const MiniCard = React.memo(function MiniCard({ title, subtitle }) {
  return (
    <View style={portalStyles.miniCard}>
      <Text style={portalStyles.miniTitle} numberOfLines={1}>
        {title}
      </Text>
      {!!subtitle && (
        <Text style={portalStyles.miniSub} numberOfLines={2}>
          {subtitle}
        </Text>
      )}
    </View>
  );
});

export default function TrainingInfoScreen() {
  const { overview } = usePortal();
  const { refreshing, onRefresh } = usePortalRefresh();

  const reg = overview?.registration || {};
  const metrics = overview?.performance?.metrics || {};

  const total = Number(metrics?.total ?? reg?.sessions ?? 0) || 0;
  const remaining = Number(metrics?.remaining ?? 0) || 0;
  const elapsed = Math.max(0, total - remaining);

  const availableCourses = useMemo(() => overview?.available?.courses || [], [overview?.available?.courses]);
  const availableGroups = useMemo(() => overview?.available?.groups || [], [overview?.available?.groups]);

  const data = useMemo(() => [{ id: 'training' }], []);

  return (
    <PortalScreen>
      <FlatList
        data={data}
        keyExtractor={(i) => i.id}
        renderItem={() => (
          <View style={{ paddingBottom: 24 }}>
            <PortalHeader title="Training Info" subtitle={overview?.academyName || ''} />

            {!overview ? (
              <PortalEmptyState
                title="No training data"
                message="Pull to refresh to load your training info."
                action={onRefresh}
                actionLabel="Refresh"
              />
            ) : (
              <>
                <Animated.View entering={FadeInUp.duration(240)}>
                  <Card>
                    <Text style={portalStyles.blockTitle}>Current Registration</Text>
                    <Text style={portalStyles.blockLine}>Group: <Text style={portalStyles.em}>{reg?.group?.name || '—'}</Text></Text>
                    <Text style={portalStyles.blockLine}>Course: <Text style={portalStyles.em}>{reg?.course?.name || '—'}</Text></Text>
                    <Text style={portalStyles.blockLine}>Level: <Text style={portalStyles.em}>{reg?.level || '—'}</Text></Text>
                    <Text style={portalStyles.blockLine}>Dates: <Text style={portalStyles.em}>{reg?.startDate ? formatDate(reg.startDate) : '—'} → {reg?.endDate ? formatDate(reg.endDate) : '—'}</Text></Text>

                    {!!(reg?.group?.schedule?.length) && (
                      <View style={{ marginTop: 10 }}>
                        <Text style={portalStyles.muted}>Schedule</Text>
                        {reg.group.schedule.map((s, idx) => (
                          <Text key={idx} style={portalStyles.scheduleLine} numberOfLines={1}>
                            • {s?.label || `${s?.day || ''} ${s?.time || ''}`.trim()}
                          </Text>
                        ))}
                      </View>
                    )}
                  </Card>
                </Animated.View>

                <Animated.View entering={FadeInUp.delay(60).duration(240)}>
                  <Card style={{ marginTop: 10 }}>
                    <Text style={portalStyles.blockTitle}>Sessions Progress</Text>
                    <View style={portalStyles.sessionsRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={portalStyles.kpiValueSm}>{elapsed} / {total}</Text>
                        <Text style={portalStyles.muted}>Elapsed • Remaining: {remaining}</Text>
                      </View>
                    </View>
                    <ProgressBar value={elapsed} max={Math.max(1, total)} />
                  </Card>
                </Animated.View>

                <Animated.View entering={FadeInUp.delay(120).duration(240)}>
                  <Card style={{ marginTop: 10 }}>
                    <Text style={portalStyles.blockTitle}>Available Courses</Text>
                    <View style={portalStyles.compactCardGrid}>
                      {availableCourses.length ? availableCourses.map((c, idx) => (
                        <MiniCard
                          key={c?.id ?? idx}
                          title={c?.name || c?.title || String(c)}
                          subtitle={c?.startDate && c?.endDate ? `${formatDate(c.startDate)} → ${formatDate(c.endDate)}` : ''}
                        />
                      )) : <Text style={portalStyles.muted}>None</Text>}
                    </View>
                  </Card>

                  <Card style={{ marginTop: 10 }}>
                    <Text style={portalStyles.blockTitle}>Available Groups</Text>
                    <View style={portalStyles.compactCardGrid}>
                      {availableGroups.length ? availableGroups.map((g, idx) => (
                        <MiniCard
                          key={g?.id ?? idx}
                          title={g?.name || g?.title || String(g)}
                          subtitle={g?.schedule?.length ? g.schedule.map((s) => s.label).join(', ') : ''}
                        />
                      )) : <Text style={portalStyles.muted}>None</Text>}
                    </View>
                  </Card>
                </Animated.View>
              </>
            )}
          </View>
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F97316" />}
        contentContainerStyle={portalStyles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </PortalScreen>
  );
}
