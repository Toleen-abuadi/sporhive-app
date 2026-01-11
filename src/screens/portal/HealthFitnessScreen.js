// src/screens/portal/HealthFitnessScreen.js
import React, { useMemo } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { usePortal, usePortalRefresh } from '../../services/portal/portal.hooks';
import { selectHealthInfo } from '../../services/portal/portal.store';
import { formatDate } from '../../services/portal/portal.normalize';
import { portalStyles } from '../../theme/portal.styles';
import { Card, PortalEmptyState, PortalHeader, PortalScreen } from '../../components/portal/PortalPrimitives';

const bmi = (hCm, wKg) => {
  const h = Number(hCm);
  const w = Number(wKg);
  if (!h || !w) return null;
  const m = h / 100;
  return (w / (m * m)).toFixed(1);
};

const FitnessCard = React.memo(function FitnessCard({ title, value, subtitle }) {
  return (
    <Card style={portalStyles.fitnessCard}>
      <Text style={portalStyles.kpiTitle}>{title}</Text>
      <Text style={portalStyles.kpiValue}>{value}</Text>
      {!!subtitle && <Text style={portalStyles.muted}>{subtitle}</Text>}
    </Card>
  );
});

export default function HealthFitnessScreen() {
  const { overview } = usePortal();
  const { refreshing, onRefresh } = usePortalRefresh();

  const health = useMemo(() => selectHealthInfo(overview), [overview]);
  const height = health?.height;
  const weight = health?.weight;
  const bmiValue = useMemo(() => bmi(height, weight), [height, weight]);
  const hasHealth = !!(height || weight);

  return (
    <PortalScreen>
      <FlatList
        data={[{ id: 'health' }]}
        keyExtractor={(i) => i.id}
        renderItem={() => (
          <View style={{ paddingBottom: 24 }}>
            <PortalHeader title="Health" subtitle={overview?.academyName || ''} />

            {!overview ? (
              <PortalEmptyState
                title="No health data"
                message="Pull to refresh to load your health info."
                action={onRefresh}
                actionLabel="Refresh"
              />
            ) : !hasHealth ? (
              <PortalEmptyState
                title="No health data yet"
                message="Your academy will update height and weight when recorded."
                action={onRefresh}
                actionLabel="Refresh"
              />
            ) : (
              <Animated.View entering={FadeInUp.duration(220)} style={{ marginTop: 10 }}>
                <View style={portalStyles.fitnessGrid}>
                  <FitnessCard title="Height" value={`${height ?? '—'} cm`} subtitle="Current" />
                  <FitnessCard title="Weight" value={`${weight ?? '—'} kg`} subtitle="Current" />
                  <FitnessCard title="BMI" value={bmiValue ?? '—'} subtitle={bmiValue ? 'Estimate' : 'N/A'} />
                </View>

                <Card style={{ marginTop: 10 }}>
                  <Text style={portalStyles.blockTitle}>Last recorded</Text>
                  <Text style={portalStyles.em}>{health?.timestamp ? formatDate(health.timestamp) : '—'}</Text>
                </Card>
              </Animated.View>
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
