// src/screens/portal/HealthFitnessScreen.js
import React, { useMemo } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { useI18n } from '../../services/i18n/i18n';
import { usePortalOverview } from '../../services/portal/portal.hooks';
import { portalStyles } from '../../theme/portal.styles';
import { Card, ErrorBanner, PortalHeader, PortalScreen, SkeletonBlock } from '../../components/portal/PortalPrimitives';

const fmtDateTime = (d) => {
  if (!d) return '';
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return '';
  return x.toLocaleString();
};

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
  const { t } = useI18n();
  const { overview, loading, refreshing, error, refresh } = usePortalOverview();

  const health = overview?.health_info || {};
  const height = health?.height ?? health?.height_cm;
  const weight = health?.weight ?? health?.weight_kg;

  const bmiValue = useMemo(() => bmi(height, weight), [height, weight]);
  const hasHealth = !!(height || weight);

  return (
    <PortalScreen>
      <FlatList
        data={[{ id: 'health' }]}
        keyExtractor={(i) => i.id}
        renderItem={() => (
          <View style={{ paddingBottom: 24 }}>
            <PortalHeader title={t('portal.health.title', 'Health & Fitness')} subtitle={t('portal.health.subtitle', 'Track your basics')} />

            {loading ? (
              <View style={{ marginTop: 12 }}>
                <Card>
                  <SkeletonBlock h={14} w="55%" r={8} />
                  <SkeletonBlock h={10} w="70%" r={8} style={{ marginTop: 10 }} />
                  <SkeletonBlock h={10} w="90%" r={8} style={{ marginTop: 12 }} />
                </Card>
              </View>
            ) : error ? (
              <ErrorBanner title={t('portal.errors.overviewTitle', 'Could not load overview')} desc={error?.message} onRetry={refresh} />
            ) : !hasHealth ? (
              <Card style={{ marginTop: 10 }}>
                <Text style={portalStyles.emptyTitle}>{t('portal.health.emptyTitle', 'No health data yet')}</Text>
                <Text style={portalStyles.muted}>
                  {t('portal.health.emptyDesc', 'Your academy will update height and weight when recorded.')}
                </Text>

                <View style={portalStyles.tipsBox}>
                  <Text style={portalStyles.tipsTitle}>{t('portal.health.tipsTitle','Tips')}</Text>
                  <Text style={portalStyles.tipsText}>• {t('portal.health.tip1','Stay hydrated before training.')}</Text>
                  <Text style={portalStyles.tipsText}>• {t('portal.health.tip2','Sleep 8 hours for better recovery.')}</Text>
                  <Text style={portalStyles.tipsText}>• {t('portal.health.tip3','Warm up 10 minutes to prevent injuries.')}</Text>
                </View>
              </Card>
            ) : (
              <>
                <Animated.View entering={FadeInUp.duration(220)} style={{ marginTop: 10 }}>
                  <View style={portalStyles.fitnessGrid}>
                    <FitnessCard title={t('portal.health.height','Height')} value={`${height ?? '—'} cm`} subtitle={t('portal.health.current','Current')} />
                    <FitnessCard title={t('portal.health.weight','Weight')} value={`${weight ?? '—'} kg`} subtitle={t('portal.health.current','Current')} />
                    <FitnessCard title={t('portal.health.bmi','BMI')} value={bmiValue ?? '—'} subtitle={bmiValue ? t('portal.health.bmiHint','Estimate') : t('portal.common.na','N/A')} />
                  </View>

                  <Card style={{ marginTop: 10 }}>
                    <Text style={portalStyles.blockTitle}>{t('portal.health.lastUpdated','Last recorded')}</Text>
                    <Text style={portalStyles.em}>{fmtDateTime(health?.timestamp || health?.updated_at || health?.created_at) || '—'}</Text>

                    <View style={portalStyles.tipsBox}>
                      <Text style={portalStyles.tipsTitle}>{t('portal.health.tipsTitle','Tips')}</Text>
                      <Text style={portalStyles.tipsText}>• {t('portal.health.tip1','Stay hydrated before training.')}</Text>
                      <Text style={portalStyles.tipsText}>• {t('portal.health.tip2','Sleep 8 hours for better recovery.')}</Text>
                      <Text style={portalStyles.tipsText}>• {t('portal.health.tip3','Warm up 10 minutes to prevent injuries.')}</Text>
                    </View>
                  </Card>
                </Animated.View>
              </>
            )}
          </View>
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#F97316" />}
        contentContainerStyle={portalStyles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </PortalScreen>
  );
}
