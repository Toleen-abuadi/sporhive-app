// src/screens/portal/TrainingInfoScreen.js
import React, { useMemo } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { useI18n } from '../../services/i18n/i18n';
import { usePortalOverview } from '../../services/portal/portal.hooks';
import { portalStyles } from '../../theme/portal.styles';
import { Card, ErrorBanner, Pill, PortalHeader, PortalScreen, SkeletonBlock } from '../../components/portal/PortalPrimitives';

const fmt = (d) => {
  if (!d) return '—';
  const x = new Date(d);
  return Number.isNaN(x.getTime()) ? '—' : x.toLocaleDateString();
};

const formatScheduleItem = (s) => {
  if (!s) return '';
  if (typeof s === 'string') return s;
  const day = s?.day || '';
  const t = s?.time;
  if (t && typeof t === 'object') {
    const a = t?.start || '';
    const b = t?.end || '';
    const time = [a, b].filter(Boolean).join('–');
    return `${day} ${time}`.trim();
  }
  return `${day} ${s?.time || ''}`.trim() || JSON.stringify(s);
};

const ProgressBar = React.memo(function ProgressBar({ value = 0, max = 1 }) {
  const pct = Math.max(0, Math.min(1, max ? value / max : 0));
  return (
    <View style={portalStyles.progressTrack}>
      <View style={[portalStyles.progressFill, { width: `${pct * 100}%` }]} />
    </View>
  );
});

const MiniCard = React.memo(function MiniCard({ title, subtitle, tone }) {
  return (
    <View style={portalStyles.miniCard}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={portalStyles.miniTitle} numberOfLines={1}>
          {title}
        </Text>
        {!!tone && <View style={{ marginLeft: 8 }}><Pill label={tone} tone="neutral" /></View>}
      </View>
      {!!subtitle && (
        <Text style={portalStyles.miniSub} numberOfLines={2}>
          {subtitle}
        </Text>
      )}
    </View>
  );
});

export default function TrainingInfoScreen() {
  const { t } = useI18n();
  const { overview, loading, refreshing, error, refresh } = usePortalOverview();

  const reg = overview?.registration || {};
  const metrics = overview?.performance_feedback?.metrics || {};

  const total = Number(metrics?.total ?? reg?.totalSessions ?? 0) || 0;
  const remaining = Number(metrics?.remaining ?? reg?.remainingSessions ?? 0) || 0;
  const elapsed = Math.max(0, total - remaining);

  const freeze = metrics?.freeze || {};
  const currentFreeze = freeze?.current || {};
  const upcomingFreeze = freeze?.upcoming || {};
  const counts = freeze?.counts || {};

  const availableCourses = useMemo(() => reg?.availableCourses || [], [reg?.availableCourses]);
  const availableGroups = useMemo(() => reg?.availableGroups || [], [reg?.availableGroups]);

  const data = useMemo(() => [{ id: 'training' }], []);

  return (
    <PortalScreen>
      <FlatList
        data={data}
        keyExtractor={(i) => i.id}
        renderItem={() => (
          <View style={{ paddingBottom: 24 }}>
            <PortalHeader title={t('portal.training.title', 'Training Info')} subtitle={t('portal.training.subtitle', 'Details, sessions, and freezes')} />

            {loading ? (
              <View style={{ marginTop: 12 }}>
                <Card>
                  <SkeletonBlock h={16} w="55%" r={8} />
                  <SkeletonBlock h={12} w="70%" r={8} style={{ marginTop: 10 }} />
                  <SkeletonBlock h={10} w="90%" r={8} style={{ marginTop: 14 }} />
                </Card>
              </View>
            ) : error ? (
              <ErrorBanner title={t('portal.errors.overviewTitle', 'Could not load overview')} desc={error?.message} onRetry={refresh} />
            ) : (
              <>
                <Animated.View entering={FadeInUp.duration(240)}>
                  <Card>
                    <Text style={portalStyles.blockTitle}>{t('portal.training.current', 'Current Registration')}</Text>
                    <Text style={portalStyles.blockLine}>
                      {t('portal.training.group', 'Group')}: <Text style={portalStyles.em}>{reg?.groupName || '—'}</Text>
                    </Text>
                    <Text style={portalStyles.blockLine}>
                      {t('portal.training.course', 'Course')}: <Text style={portalStyles.em}>{reg?.courseName || '—'}</Text>
                    </Text>
                    <Text style={portalStyles.blockLine}>
                      {t('portal.training.level', 'Level')}: <Text style={portalStyles.em}>{reg?.level || '—'}</Text>
                    </Text>
                    <Text style={portalStyles.blockLine}>
                      {t('portal.training.dates', 'Dates')}: <Text style={portalStyles.em}>{fmt(reg?.startDate)} → {fmt(reg?.endDate)}</Text>
                    </Text>

                    {!!(reg?.schedulePreview?.length) && (
                      <View style={{ marginTop: 10 }}>
                        <Text style={portalStyles.muted}>{t('portal.training.schedule', 'Schedule')}</Text>
                        {reg.schedulePreview.map((s, idx) => (
                          <Text key={idx} style={portalStyles.scheduleLine} numberOfLines={1}>
                            • {formatScheduleItem(s)}
                          </Text>
                        ))}
                      </View>
                    )}
                  </Card>
                </Animated.View>

                <Animated.View entering={FadeInUp.delay(60).duration(240)}>
                  <Card style={{ marginTop: 10 }}>
                    <Text style={portalStyles.blockTitle}>{t('portal.training.sessionsProgress', 'Sessions Progress')}</Text>
                    <View style={portalStyles.sessionsRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={portalStyles.kpiValueSm}>{elapsed} / {total}</Text>
                        <Text style={portalStyles.muted}>{t('portal.training.elapsed', 'Elapsed')} • {t('portal.training.remaining', 'Remaining')}: {remaining}</Text>
                      </View>
                      <Pill label={remaining > 0 ? t('portal.common.active', 'Active') : t('portal.common.done', 'Done')} tone={remaining > 0 ? 'success' : 'neutral'} />
                    </View>
                    <ProgressBar value={elapsed} max={Math.max(1, total)} />
                  </Card>
                </Animated.View>

                <Animated.View entering={FadeInUp.delay(120).duration(240)}>
                  <Card style={{ marginTop: 10 }}>
                    <Text style={portalStyles.blockTitle}>{t('portal.freeze.title', 'Freeze Info')}</Text>

                    <View style={portalStyles.twoCol}>
                      <View style={portalStyles.twoColItem}>
                        <Text style={portalStyles.muted}>{t('portal.freeze.current', 'Current')}</Text>
                        <Text style={portalStyles.em}>
                          {currentFreeze?.start ? `${fmt(currentFreeze.start)} → ${fmt(currentFreeze.end)}` : t('portal.freeze.none', 'None')}
                        </Text>
                      </View>

                      <View style={portalStyles.twoColItem}>
                        <Text style={portalStyles.muted}>{t('portal.freeze.upcoming', 'Upcoming')}</Text>
                        <Text style={portalStyles.em}>
                          {upcomingFreeze?.start ? `${fmt(upcomingFreeze.start)} → ${fmt(upcomingFreeze.end)}` : t('portal.freeze.none', 'None')}
                        </Text>
                      </View>
                    </View>

                    {(counts && (counts.approved || counts.pending || counts.rejected)) ? (
                      <View style={{ marginTop: 10, flexDirection: 'row', flexWrap: 'wrap' }}>
                        <View style={{ marginRight: 8, marginBottom: 8 }}><Pill label={`${t('portal.freeze.approved','Approved')}: ${counts.approved || 0}`} tone="success" /></View>
                        <View style={{ marginRight: 8, marginBottom: 8 }}><Pill label={`${t('portal.freeze.pending','Pending')}: ${counts.pending || 0}`} tone="warning" /></View>
                        <View style={{ marginRight: 8, marginBottom: 8 }}><Pill label={`${t('portal.freeze.rejected','Rejected')}: ${counts.rejected || 0}`} tone="danger" /></View>
                      </View>
                    ) : (
                      <Text style={[portalStyles.muted, { marginTop: 10 }]}>{t('portal.freeze.noSummary','No freeze summary available.')}</Text>
                    )}
                  </Card>
                </Animated.View>

                <Animated.View entering={FadeInUp.delay(180).duration(240)}>
                  <Card style={{ marginTop: 10 }}>
                    <Text style={portalStyles.blockTitle}>{t('portal.training.availableCourses', 'Available Courses')}</Text>
                    <View style={portalStyles.compactCardGrid}>
                      {availableCourses.length ? availableCourses.map((c, idx) => (
                        <MiniCard
                          key={c?.id ?? idx}
                          title={c?.name || c?.title || String(c)}
                          subtitle={c?.desc || c?.description || ''}
                        />
                      )) : <Text style={portalStyles.muted}>{t('portal.common.none', 'None')}</Text>}
                    </View>
                  </Card>

                  <Card style={{ marginTop: 10 }}>
                    <Text style={portalStyles.blockTitle}>{t('portal.training.availableGroups', 'Available Groups')}</Text>
                    <View style={portalStyles.compactCardGrid}>
                      {availableGroups.length ? availableGroups.map((g, idx) => (
                        <MiniCard
                          key={g?.id ?? idx}
                          title={g?.name || g?.title || String(g)}
                          subtitle={
                            Array.isArray(g?.schedule)
                              ? g.schedule.slice(0, 2).map(formatScheduleItem).filter(Boolean).join(' • ')
                              : (g?.time || g?.desc || '')
                          }
                        />
                      )) : <Text style={portalStyles.muted}>{t('portal.common.none', 'None')}</Text>}
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
