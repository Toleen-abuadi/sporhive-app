import React, { useMemo, useState, useEffect } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Screen } from '../../components/ui/Screen';
import { Text } from '../../components/ui/Text';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { PortalHeader } from '../../components/portal/PortalHeader';
import { PortalCard } from '../../components/portal/PortalCard';
import { PortalEmptyState } from '../../components/portal/PortalEmptyState';
import { portalApi } from '../../services/portal/portal.api';
import { usePortalOverview } from '../../services/portal/portal.hooks';
import { useToast } from '../../components/ui/ToastHost';
import { spacing } from '../../theme/tokens';

const steps = ['Type', 'Plan', 'Schedule', 'Review'];

export function PortalRenewalsScreen() {
  const { colors } = useTheme();
  const toast = useToast();
  const { overview } = usePortalOverview();
  const [eligibility, setEligibility] = useState(null);
  const [checking, setChecking] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [step, setStep] = useState(0);
  const [type, setType] = useState('subscription');
  const [level, setLevel] = useState('');
  const [course, setCourse] = useState('');
  const [group, setGroup] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sessions, setSessions] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const subscriptionEnd = overview?.registration?.endDate || '';

  const daysLeft = useMemo(() => {
    if (!subscriptionEnd) return null;
    const end = new Date(subscriptionEnd).getTime();
    if (Number.isNaN(end)) return null;
    const diff = Math.max(0, Math.ceil((end - Date.now()) / (1000 * 60 * 60 * 24)));
    return diff;
  }, [subscriptionEnd]);

  useEffect(() => {
    if (startDate && endDate && !sessions) {
      const start = new Date(startDate).getTime();
      const end = new Date(endDate).getTime();
      if (!Number.isNaN(start) && !Number.isNaN(end) && end > start) {
        const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        const estimated = Math.max(4, Math.round(diffDays / 7) * 2);
        setSessions(String(estimated));
      }
    }
  }, [endDate, sessions, startDate]);

  const levels = overview?.levels || [];
  const courses = overview?.registration?.availableCourses || [];
  const groups = overview?.registration?.availableGroups || [];

  const onCheckEligibility = async () => {
    setChecking(true);
    const res = await portalApi.checkRenewalEligibility({});
    if (res?.success) {
      setEligibility(res.data?.data || res.data);
      if (res.data?.eligible || res.data?.data?.eligible) {
        setShowDialog(true);
      }
    } else {
      toast.error(res?.error?.message || 'Unable to check eligibility.');
    }
    setChecking(false);
  };

  const canAdvance = () => {
    if (step === 0) return !!type;
    if (step === 1) return !!level && (type === 'subscription' || !!course) && !!group;
    if (step === 2) return !!startDate && !!endDate && !!sessions;
    return true;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const payload = {
      type,
      level,
      course,
      group,
      start_date: startDate,
      end_date: endDate,
      sessions: Number(sessions),
      note,
    };
    const res = await portalApi.submitRenewal(payload);
    if (res?.success) {
      toast.success('Renewal request submitted.');
      setShowDialog(false);
    } else {
      toast.error(res?.error?.message || 'Renewal failed.');
    }
    setSubmitting(false);
  };

  return (
    <Screen scroll contentContainerStyle={styles.scroll}>
      <PortalHeader title="Renewals" subtitle="Keep your season active" />

      <PortalCard style={styles.card}>
        <Text variant="body" weight="semibold" color={colors.textPrimary}>
          Subscription status
        </Text>
        <Text variant="bodySmall" color={colors.textSecondary} style={styles.subtitle}>
          Ends on {subscriptionEnd || '—'} {daysLeft != null ? `• ${daysLeft} days left` : ''}
        </Text>
        <Button variant="secondary" onPress={onCheckEligibility} loading={checking}>
          Check eligibility
        </Button>
      </PortalCard>

      {eligibility ? (
        <PortalCard>
          <Text variant="body" weight="semibold" color={colors.textPrimary}>
            Eligibility result
          </Text>
          <Text variant="bodySmall" color={colors.textSecondary} style={styles.subtitle}>
            {eligibility?.message || 'Eligible to renew your subscription.'}
          </Text>
          {(eligibility?.eligible || eligibility?.data?.eligible) && (
            <Button style={styles.primaryButton} onPress={() => setShowDialog(true)}>
              Start renewal request
            </Button>
          )}
        </PortalCard>
      ) : (
        <PortalEmptyState
          icon="check-circle"
          title="No eligibility check yet"
          description="Run a quick check to see available renewal options."
        />
      )}

      <Modal visible={showDialog} transparent animationType="slide">
        <View style={[styles.modalBackdrop, { backgroundColor: colors.black + '55' }]}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text variant="body" weight="semibold" color={colors.textPrimary}>
                Renewal request
              </Text>
              <TouchableOpacity onPress={() => setShowDialog(false)}>
                <Text variant="bodySmall" color={colors.textSecondary}>
                  Close
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.stepper}>
              {steps.map((label, index) => (
                <View key={label} style={styles.stepItem}>
                  <View
                    style={[
                      styles.stepDot,
                      {
                        backgroundColor: index <= step ? colors.accentOrange : colors.border,
                      },
                    ]}
                  />
                  <Text variant="caption" color={index <= step ? colors.textPrimary : colors.textMuted}>
                    {label}
                  </Text>
                </View>
              ))}
            </View>

            {step === 0 && (
              <View style={styles.stepContent}>
                <TouchableOpacity
                  style={[styles.choiceCard, type === 'subscription' && { borderColor: colors.accentOrange }]}
                  onPress={() => setType('subscription')}
                >
                  <Text variant="body" weight="semibold" color={colors.textPrimary}>
                    Subscription
                  </Text>
                  <Text variant="bodySmall" color={colors.textSecondary}>
                    Full season package with sessions
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.choiceCard, type === 'course' && { borderColor: colors.accentOrange }]}
                  onPress={() => setType('course')}
                >
                  <Text variant="body" weight="semibold" color={colors.textPrimary}>
                    Course
                  </Text>
                  <Text variant="bodySmall" color={colors.textSecondary}>
                    Focused course-only enrolment
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {step === 1 && (
              <View style={styles.stepContent}>
                <Input label="Level" value={level} onChangeText={setLevel} placeholder={levels[0]?.name || 'Level'} />
                {type === 'course' ? (
                  <Input label="Course" value={course} onChangeText={setCourse} placeholder={courses[0]?.name || 'Course'} />
                ) : null}
                <Input label="Group" value={group} onChangeText={setGroup} placeholder={groups[0]?.name || 'Group'} />
              </View>
            )}

            {step === 2 && (
              <View style={styles.stepContent}>
                <Input label="Start date" value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" />
                <Input label="End date" value={endDate} onChangeText={setEndDate} placeholder="YYYY-MM-DD" />
                <Input label="Sessions" value={sessions} onChangeText={setSessions} placeholder="e.g. 24" keyboardType="numeric" />
              </View>
            )}

            {step === 3 && (
              <View style={styles.stepContent}>
                <PortalCard style={styles.reviewCard}>
                  <Text variant="body" weight="semibold" color={colors.textPrimary}>
                    Review
                  </Text>
                  <Text variant="bodySmall" color={colors.textSecondary} style={styles.subtitle}>
                    {type} • {level} • {course || 'Standard'}
                  </Text>
                  <Text variant="bodySmall" color={colors.textSecondary}>
                    {startDate} → {endDate} • {sessions} sessions
                  </Text>
                </PortalCard>
                <Input label="Optional note" value={note} onChangeText={setNote} placeholder="Add a note for the academy" />
              </View>
            )}

            <View style={styles.modalActions}>
              <Button variant="secondary" onPress={() => setStep((prev) => Math.max(prev - 1, 0))}>
                Back
              </Button>
              {step < steps.length - 1 ? (
                <Button onPress={() => setStep((prev) => prev + 1)} disabled={!canAdvance()}>
                  Next
                </Button>
              ) : (
                <Button onPress={handleSubmit} loading={submitting}>
                  Submit request
                </Button>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing.lg,
  },
  card: {
    marginBottom: spacing.lg,
  },
  subtitle: {
    marginTop: spacing.xs,
  },
  primaryButton: {
    marginTop: spacing.md,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalCard: {
    padding: spacing.lg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: spacing.md,
  },
  stepItem: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  stepContent: {
    gap: spacing.sm,
  },
  choiceCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: spacing.md,
    borderColor: 'transparent',
  },
  reviewCard: {
    marginBottom: spacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});
