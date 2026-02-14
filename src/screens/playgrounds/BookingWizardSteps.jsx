// src/screens/playgrounds/BookingWizardSteps.jsx
import React from 'react';
import { Image, Pressable, View } from 'react-native';
import {
  CalendarDays,
  Clock,
  CreditCard,
  Upload,
  Users,
  Sun,
  Moon,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

import { Text } from '../../components/ui/Text';
import { Chip } from '../../components/ui/Chip';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { SporHiveLoader } from '../../components/ui/SporHiveLoader';

const QUICK_PLAYER_SUGGESTIONS = [2, 4, 6, 8];

const DEFAULT_COLORS = {
  surface: '#FFFFFF',
  surfaceElevated: '#F5F5F5',
  background: '#FFFFFF',

  textPrimary: '#111111',
  textSecondary: '#666666',
  textMuted: '#8A8A8A',

  border: '#E6E6E6',
  accentOrange: '#FF7A00',

  error: '#D92D20',
  errorSoft: '#FEE4E2',
  success: '#12B76A',
  successSoft: '#D1FADF',
};

function safeTranslator(tProp) {
  if (typeof tProp === 'function') return tProp;
  return () => '';
}

function safeObjectColors(colorsProp) {
  if (colorsProp && typeof colorsProp === 'object') return { ...DEFAULT_COLORS, ...colorsProp };
  return DEFAULT_COLORS;
}

function Card({ colors, children }) {
  return (
    <View
      style={{
        borderRadius: 18,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        overflow: 'hidden',
      }}
    >
      {children}
    </View>
  );
}

function SectionTitle({ colors, icon, title, subtitle }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
      <View
        style={{
          height: 38,
          width: 38,
          borderRadius: 19,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.surfaceElevated,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        {icon}
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="bodyLarge" weight="bold">
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" color={colors.textSecondary} style={{ marginTop: 2 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function OptionCard({ colors, selected, onPress, title, subtitle, leftIcon, rightMeta }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        padding: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: selected ? colors.accentOrange : colors.border,
        backgroundColor: pressed ? colors.surfaceElevated : colors.surface,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
        {leftIcon}
        <View style={{ flex: 1 }}>
          <Text variant="bodyLarge" weight="semibold">
            {title}
          </Text>
          {subtitle ? (
            <Text variant="caption" color={colors.textSecondary}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        {rightMeta}
        {selected ? <CheckCircle2 size={18} color={colors.accentOrange} /> : null}
      </View>
    </Pressable>
  );
}

function Row({ label, value, colors }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <Text variant="caption" color={colors.textSecondary}>
        {label}
      </Text>
      <Text variant="bodySmall" weight="semibold">
        {value}
      </Text>
    </View>
  );
}

function WizardHeader({ colors, t, step, title, onBack }) {
  const pct = Math.round(((step + 1) / 4) * 100);

  return (
    <View
      style={{
        padding: 16,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable
          onPress={onBack}
          style={({ pressed }) => ({
            height: 40,
            width: 40,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: pressed ? colors.surfaceElevated : colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
          })}
          hitSlop={10}
        >
          <ChevronLeft size={20} color={colors.textPrimary} />
        </Pressable>

        <View style={{ alignItems: 'center', flex: 1 }}>
          <Text variant="caption" color={colors.textSecondary}>
            {t('service.playgrounds.booking.stepCounter', { current: step + 1, total: 4 }) ||
              `Step ${step + 1} of 4`}
          </Text>
          <Text variant="bodyLarge" weight="bold">
            {title}
          </Text>
        </View>

        <View style={{ height: 40, width: 40 }} />
      </View>

      <View
        style={{
          marginTop: 12,
          height: 6,
          borderRadius: 999,
          overflow: 'hidden',
          backgroundColor: colors.surfaceElevated,
        }}
      >
        <View style={{ height: '100%', width: `${pct}%`, backgroundColor: colors.accentOrange }} />
      </View>
    </View>
  );
}

function WizardFooter({
  colors,
  t,
  step,
  priceLabel,
  submitting,
  bookingSuccess,
  disableNext,
  onBack,
  onNext,
  onConfirm,
}) {
  const isLast = step === 3;

  const primaryLabel = bookingSuccess
    ? t('service.playgrounds.booking.actions.done') || 'Done'
    : isLast
      ? t('service.playgrounds.booking.actions.confirm') || 'Confirm'
      : t('service.playgrounds.booking.actions.continue') || 'Continue';

  return (
    <View
      style={{
        marginTop: 10,
        padding: 16,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <View>
          <Text variant="caption" color={colors.textSecondary}>
            {t('service.playgrounds.booking.summary.total') || 'Total'}
          </Text>
          <Text variant="bodyLarge" weight="bold">
            {priceLabel || '--'}
          </Text>
        </View>

        {isLast ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <CheckCircle2 size={16} color={colors.textMuted} />
            <Text variant="caption" color={colors.textSecondary}>
              {t('service.playgrounds.booking.review.hint') || 'Review & confirm'}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button variant="secondary" onPress={onBack} style={{ flex: 1 }}>
          {t('service.playgrounds.booking.actions.back') || 'Back'}
        </Button>

        <Button
          onPress={bookingSuccess ? onNext : isLast ? onConfirm : onNext}
          disabled={disableNext}
          loading={submitting}
          style={{ flex: 2 }}
        >
          {primaryLabel}
        </Button>
      </View>
    </View>
  );
}

async function pickCliqImageNoCrop() {
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.85,
    allowsEditing: false,
  });
  if (res?.canceled) return null;
  return res?.assets?.[0] ?? null;
}

export function BookingWizardSteps(props) {
  const t = React.useMemo(() => safeTranslator(props?.t), [props?.t]);
  const colors = React.useMemo(() => safeObjectColors(props?.colors), [props?.colors]);

  const step = Number(props?.step ?? 0);
  const setStep = typeof props?.setStep === 'function' ? props.setStep : () => {};

  const priceLabel = props?.priceLabel ?? '--';
  const submitting = !!props?.submitting;
  const bookingSuccess = !!props?.bookingSuccess;
  const bookingResult = props?.bookingResult ?? null;
  const errorText = props?.errorText ?? '';

  const onGoToBookings = typeof props?.onGoToBookings === 'function' ? props.onGoToBookings : () => {};

  const venue = props?.venue ?? null;
  const academy = props?.academy ?? null;

  const durations = Array.isArray(props?.durations) ? props.durations : [];
  const durationsLoading = !!props?.durationsLoading;
  const selectedDurationId = props?.selectedDurationId ?? null;
  const onSelectDuration = typeof props?.onSelectDuration === 'function' ? props.onSelectDuration : () => {};

  const quickDates = Array.isArray(props?.quickDates) ? props.quickDates : [];
  const bookingDate = props?.bookingDate ?? null;
  const onSelectDate = typeof props?.onSelectDate === 'function' ? props.onSelectDate : () => {};

  const slots = Array.isArray(props?.slots) ? props.slots : [];
  const slotsLoading = !!props?.slotsLoading;
  const selectedSlot = props?.selectedSlot ?? null;
  const onSelectSlot = typeof props?.onSelectSlot === 'function' ? props.onSelectSlot : () => {};

  const players = Number(props?.players ?? 0);
  const minPlayers = Number(props?.minPlayers ?? 1);
  const maxPlayers = Number(props?.maxPlayers ?? 99);
  const onPlayersPreset = typeof props?.onPlayersPreset === 'function' ? props.onPlayersPreset : () => {};
  const onPlayersInc = typeof props?.onPlayersInc === 'function' ? props.onPlayersInc : () => {};
  const onPlayersDec = typeof props?.onPlayersDec === 'function' ? props.onPlayersDec : () => {};

  const allowCash = !!props?.allowCash;
  const allowCashOnDate = !!props?.allowCashOnDate;
  const allowCliq = !!props?.allowCliq;
  const cliqName = props?.cliqName ?? '';
  const cliqNumber = props?.cliqNumber ?? '';

  const paymentType = props?.paymentType ?? null;
  const onPaymentType = typeof props?.onPaymentType === 'function' ? props.onPaymentType : () => {};
  const cashOnDate = !!props?.cashOnDate;
  const onCashOnDate = typeof props?.onCashOnDate === 'function' ? props.onCashOnDate : () => {};
  const cliqImage = props?.cliqImage ?? null;
  const onPickCliqImage = typeof props?.onPickCliqImage === 'function' ? props.onPickCliqImage : () => {};
  const inlinePaymentError = props?.inlinePaymentError ?? '';

  const onBack = typeof props?.onBack === 'function' ? props.onBack : () => {};
  const onNext = typeof props?.onNext === 'function' ? props.onNext : () => {};
  const onConfirm = typeof props?.onConfirm === 'function' ? props.onConfirm : () => {};

  const scheduleReady = !!props?.scheduleReady;
  const playersValid = !!props?.playersValid;
  const paymentReady = !!props?.paymentReady;
  const allValid = !!props?.allValid;

  const formatSlotLabel =
    typeof props?.formatSlotLabel === 'function'
      ? props.formatSlotLabel
      : (s) => String(s?.start_time ?? s?.start ?? '');

  const stepTitle = React.useMemo(() => {
    const titles = [
      t('service.playgrounds.booking.titles.schedule') || 'Schedule',
      t('service.playgrounds.booking.titles.players') || 'Players',
      t('service.playgrounds.booking.titles.payment') || 'Payment',
      t('service.playgrounds.booking.titles.review') || 'Review',
    ];
    return titles[step] || titles[0];
  }, [step, t]);

  const disableNext =
    bookingSuccess ||
    submitting ||
    (step === 0 && !scheduleReady) ||
    (step === 1 && !playersValid) ||
    (step === 2 && !paymentReady) ||
    (step === 3 && !allValid);

  return (
    <View style={{ gap: 14, position: 'relative' }}>
      <WizardHeader colors={colors} t={t} step={step} title={stepTitle} onBack={onBack} />

      {/* Venue hero (no crop) */}
      <Card colors={colors}>
        <View
          style={{
            height: 160,
            backgroundColor: colors.surfaceElevated,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {venue?.cover_image || venue?.image || venue?.images?.[0] ? (
            <Image
              source={{ uri: venue?.cover_image || venue?.image || venue?.images?.[0] }}
              style={{ width: '100%', height: '100%', resizeMode: 'contain' }}
            />
          ) : (
            <Text variant="caption" color={colors.textMuted}>
              No image
            </Text>
          )}
        </View>

        <View style={{ padding: 14 }}>
          <Text variant="h4" weight="bold">
            {venue?.name || 'Venue'}
          </Text>
          <Text variant="caption" color={colors.textSecondary} numberOfLines={1}>
            {academy?.public_name || (t('service.playgrounds.common.academy') || 'Academy')}
          </Text>
        </View>
      </Card>

      {/* STEP 0 — Schedule */}
      {step === 0 && (
        <View style={{ gap: 14 }}>
          <Card colors={colors}>
            <View style={{ padding: 14 }}>
              <SectionTitle
                colors={colors}
                icon={<Clock size={18} color={colors.textPrimary} />}
                title={t('service.playgrounds.booking.schedule.duration') || 'Duration'}
                subtitle={t('service.playgrounds.booking.schedule.durationSubtitle') || 'Choose the time length'}
              />

              {durationsLoading ? (
                <SporHiveLoader
                  message={t('service.playgrounds.booking.schedule.loadingDurations') || 'Loading...'}
                  size={64}
                />
              ) : durations.length === 0 ? (
                <EmptyState
                  title={t('service.playgrounds.booking.schedule.noDurationsTitle') || 'No durations'}
                  message={t('service.playgrounds.booking.schedule.noDurationsMessage') || 'No durations available.'}
                  size="small"
                />
              ) : (
                <View style={{ gap: 10 }}>
                  {durations.map((d) => {
                    const minutes = Number(d?.minutes ?? d?.duration_minutes ?? 60);
                    const selected = String(d?.id) === String(selectedDurationId);
                    const price =
                      d?.base_price != null
                        ? `${Number(d.base_price)} JOD`
                        : t('service.playgrounds.booking.schedule.priceOnRequest') || 'Price on request';

                    return (
                      <OptionCard
                        key={String(d?.id ?? minutes)}
                        colors={colors}
                        selected={selected}
                        onPress={() => onSelectDuration(d?.id)}
                        title={`${minutes} min`}
                        subtitle={d?.is_default ? t('service.playgrounds.booking.schedule.mostPopular') || 'Most popular' : price}
                        leftIcon={<Clock size={18} color={selected ? colors.accentOrange : colors.textMuted} />}
                        rightMeta={
                          <Text variant="caption" color={selected ? colors.accentOrange : colors.textSecondary}>
                            {price}
                          </Text>
                        }
                      />
                    );
                  })}
                </View>
              )}
            </View>
          </Card>

          <Card colors={colors}>
            <View style={{ padding: 14 }}>
              <SectionTitle
                colors={colors}
                icon={<CalendarDays size={18} color={colors.textPrimary} />}
                title={t('service.playgrounds.booking.schedule.date') || 'Date'}
                subtitle={t('service.playgrounds.booking.schedule.dateSubtitle') || 'Pick a day'}
              />

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {quickDates.map((d, idx) => {
                  const label =
                    idx === 0
                      ? t('service.playgrounds.booking.schedule.today') || 'Today'
                      : idx === 1
                        ? t('service.playgrounds.booking.schedule.tomorrow') || 'Tomorrow'
                        : d;

                  return (
                    <Chip
                      key={String(d)}
                      label={label}
                      selected={bookingDate === d}
                      onPress={() => onSelectDate(d)}
                      size="small"
                    />
                  );
                })}
              </View>
            </View>
          </Card>

          <Card colors={colors}>
            <View style={{ padding: 14 }}>
              <SectionTitle
                colors={colors}
                icon={<Clock size={18} color={colors.textPrimary} />}
                title={t('service.playgrounds.booking.schedule.availableSlots') || 'Start time'}
                subtitle={t('service.playgrounds.booking.schedule.availableSlotsSubtitle') || 'Choose an available time slot'}
              />

              {!selectedDurationId ? (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    padding: 12,
                    borderRadius: 14,
                    backgroundColor: colors.surfaceElevated,
                  }}
                >
                  <AlertCircle size={18} color={colors.textMuted} />
                  <Text variant="bodySmall" color={colors.textSecondary}>
                    {t('service.playgrounds.booking.schedule.selectDurationFirst') || 'Select a duration first.'}
                  </Text>
                </View>
              ) : slotsLoading ? (
                <SporHiveLoader message={t('service.playgrounds.booking.schedule.loadingSlots') || 'Loading...'} size={64} />
              ) : !bookingDate ? (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    padding: 12,
                    borderRadius: 14,
                    backgroundColor: colors.surfaceElevated,
                  }}
                >
                  <CalendarDays size={18} color={colors.textMuted} />
                  <Text variant="bodySmall" color={colors.textSecondary}>
                    {t('service.playgrounds.booking.schedule.selectDateFirst') || 'Select a date first.'}
                  </Text>
                </View>
              ) : slots.length === 0 ? (
                <EmptyState
                  title={t('service.playgrounds.booking.schedule.noSlotsTitle') || 'No slots'}
                  message={t('service.playgrounds.booking.schedule.noSlotsMessage') || 'No available slots for this day.'}
                  size="small"
                />
              ) : (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  {slots.map((s, i) => {
                    const label = formatSlotLabel(s, t);

                    // robust selection compare even if no `id`
                    const selected =
                      selectedSlot?.id != null && s?.id != null
                        ? String(selectedSlot.id) === String(s.id)
                        : formatSlotLabel(selectedSlot || {}, t) === label;

                    const start = s?.start_time || s?.start || '';
                    const hour = Number(String(start).split(':')[0]);
                    const isDay = hour >= 6 && hour < 18;
                    const Icon = isDay ? Sun : Moon;

                    return (
                      <Chip
                        key={String(s?.id ?? `${start}-${i}`)}
                        label={label}
                        selected={selected}
                        onPress={() => onSelectSlot(s)}
                        size="medium"
                        icon={<Icon size={14} color={colors.textMuted} />}
                      />
                    );
                  })}
                </View>
              )}
            </View>
          </Card>
        </View>
      )}

      {/* STEP 1 — Players */}
      {step === 1 && (
        <Card colors={colors}>
          <View style={{ padding: 14 }}>
            <SectionTitle
              colors={colors}
              icon={<Users size={18} color={colors.textPrimary} />}
              title={t('service.playgrounds.booking.players.title') || 'Players'}
              subtitle={t('service.playgrounds.booking.players.subtitle') || 'How many players?'}
            />

            <View style={{ alignItems: 'center', gap: 12 }}>
              <View style={{ alignItems: 'center' }}>
                <Text variant="h1" weight="bold" color={colors.accentOrange}>
                  {players}
                </Text>
                <Text variant="caption" color={colors.textSecondary}>
                  {t('service.playgrounds.booking.players.label') || 'players'}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Button variant="secondary" onPress={onPlayersDec} disabled={players <= minPlayers}>
                  -
                </Button>
                <Button variant="secondary" onPress={onPlayersInc} disabled={players >= maxPlayers}>
                  +
                </Button>
              </View>

              <View style={{ height: 2 }} />

              <Text variant="caption" color={colors.textSecondary}>
                {t('service.playgrounds.booking.players.allowedRange', { min: minPlayers, max: maxPlayers }) ||
                  `Allowed: ${minPlayers} - ${maxPlayers}`}
              </Text>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6 }}>
                {QUICK_PLAYER_SUGGESTIONS.map((n) => (
                  <Chip key={n} label={`${n}`} selected={players === n} onPress={() => onPlayersPreset(n)} size="small" />
                ))}
              </View>
            </View>
          </View>
        </Card>
      )}

      {/* STEP 2 — Payment */}
      {step === 2 && (
        <View style={{ gap: 14 }}>
          <Card colors={colors}>
            <View style={{ padding: 14 }}>
              <SectionTitle
                colors={colors}
                icon={<CreditCard size={18} color={colors.textPrimary} />}
                title={t('service.playgrounds.booking.payment.title') || 'Payment'}
                subtitle={t('service.playgrounds.booking.payment.subtitle') || 'Choose a payment method'}
              />

              <View style={{ gap: 10 }}>
                {allowCash ? (
                  <OptionCard
                    colors={colors}
                    selected={paymentType === 'cash'}
                    onPress={() => onPaymentType('cash')}
                    title={t('service.playgrounds.booking.payment.cash') || 'Cash'}
                    subtitle={t('service.playgrounds.booking.payment.cashDescription') || 'Pay at venue'}
                    leftIcon={
                      <CreditCard size={18} color={paymentType === 'cash' ? colors.accentOrange : colors.textMuted} />
                    }
                  />
                ) : null}

                {allowCliq ? (
                  <OptionCard
                    colors={colors}
                    selected={paymentType === 'cliq'}
                    onPress={() => onPaymentType('cliq')}
                    title={t('service.playgrounds.booking.payment.cliq') || 'CliQ'}
                    subtitle={t('service.playgrounds.booking.payment.cliqDescription') || 'Upload transfer screenshot'}
                    leftIcon={<Upload size={18} color={paymentType === 'cliq' ? colors.accentOrange : colors.textMuted} />}
                  />
                ) : null}
              </View>
            </View>
          </Card>

          {paymentType === 'cash' ? (
            <Card colors={colors}>
              <View style={{ padding: 14 }}>
                <Text variant="bodyLarge" weight="bold">
                  {t('service.playgrounds.booking.payment.cashTitle') || 'Cash payment'}
                </Text>
                <Text variant="caption" color={colors.textSecondary} style={{ marginTop: 4 }}>
                  {t('service.playgrounds.booking.payment.cashSubtitle') || 'Choose when you will pay'}
                </Text>

                {allowCashOnDate ? (
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                    <Chip
                      label={t('service.playgrounds.booking.payment.payNow') || 'Pay now'}
                      selected={!cashOnDate}
                      onPress={() => onCashOnDate(false)}
                      size="medium"
                    />
                    <Chip
                      label={t('service.playgrounds.booking.payment.payOnDate') || 'Pay on date'}
                      selected={cashOnDate}
                      onPress={() => onCashOnDate(true)}
                      size="medium"
                    />
                  </View>
                ) : (
                  <View
                    style={{
                      marginTop: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      padding: 12,
                      borderRadius: 14,
                      backgroundColor: colors.surfaceElevated,
                    }}
                  >
                    <AlertCircle size={18} color={colors.textMuted} />
                    <Text variant="caption" color={colors.textSecondary}>
                      {t('service.playgrounds.booking.payment.cashOnDateUnavailable') || 'Cash-on-date is unavailable.'}
                    </Text>
                  </View>
                )}
              </View>
            </Card>
          ) : null}

          {paymentType === 'cliq' ? (
            <Card colors={colors}>
              <View style={{ padding: 14, gap: 12 }}>
                <Text variant="bodyLarge" weight="bold">
                  {t('service.playgrounds.booking.payment.cliqTitle') || 'CliQ transfer'}
                </Text>

                {cliqName || cliqNumber ? (
                  <View
                    style={{
                      padding: 12,
                      borderRadius: 14,
                      backgroundColor: colors.surfaceElevated,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    {cliqName ? (
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text variant="caption" color={colors.textSecondary}>
                          {t('service.playgrounds.booking.payment.cliqNameLabel') || 'Name'}
                        </Text>
                        <Text variant="bodySmall" weight="semibold">
                          {cliqName}
                        </Text>
                      </View>
                    ) : null}

                    {cliqNumber ? (
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                        <Text variant="caption" color={colors.textSecondary}>
                          {t('service.playgrounds.booking.payment.cliqNumberLabel') || 'Number'}
                        </Text>
                        <Text variant="bodySmall" weight="semibold">
                          {cliqNumber}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}

                <Button variant="secondary" onPress={() => onPickCliqImage(pickCliqImageNoCrop)} fullWidth>
                  {cliqImage?.uri
                    ? t('service.playgrounds.booking.payment.replaceImage') || 'Replace screenshot'
                    : t('service.playgrounds.booking.payment.uploadScreenshot') || 'Upload screenshot'}
                </Button>

                {cliqImage?.uri ? (
                  <View style={{ borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
                    <Image
                      source={{ uri: cliqImage.uri }}
                      style={{
                        width: '100%',
                        height: 220,
                        resizeMode: 'contain',
                        backgroundColor: colors.surfaceElevated,
                      }}
                    />
                  </View>
                ) : (
                  <View
                    style={{
                      alignItems: 'center',
                      padding: 18,
                      borderRadius: 16,
                      borderWidth: 2,
                      borderStyle: 'dashed',
                      borderColor: colors.border,
                    }}
                  >
                    <Upload size={26} color={colors.textMuted} />
                    <Text variant="caption" color={colors.textSecondary} style={{ marginTop: 8, textAlign: 'center' }}>
                      {t('service.playgrounds.booking.payment.uploadHint') || 'Upload a clear screenshot of your transfer'}
                    </Text>
                  </View>
                )}

                {inlinePaymentError ? (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      padding: 12,
                      borderRadius: 14,
                      backgroundColor: colors.errorSoft,
                    }}
                  >
                    <AlertCircle size={18} color={colors.error} />
                    <Text variant="caption" color={colors.error}>
                      {inlinePaymentError}
                    </Text>
                  </View>
                ) : null}
              </View>
            </Card>
          ) : null}
        </View>
      )}

      {/* STEP 3 — Review */}
      {step === 3 && (
        <Card colors={colors}>
          <View style={{ padding: 14, gap: 12 }}>
            <SectionTitle
              colors={colors}
              icon={<CheckCircle2 size={18} color={colors.textPrimary} />}
              title={t('service.playgrounds.booking.review.title') || 'Review'}
              subtitle={t('service.playgrounds.booking.review.subtitle') || 'Confirm your booking details'}
            />

            <View
              style={{
                padding: 12,
                borderRadius: 14,
                backgroundColor: colors.surfaceElevated,
                borderWidth: 1,
                borderColor: colors.border,
                gap: 10,
              }}
            >
              <Row label={t('service.playgrounds.booking.review.labels.venue') || 'Venue'} value={venue?.name || '--'} colors={colors} />
              <Row label={t('service.playgrounds.booking.review.labels.date') || 'Date'} value={bookingDate || '--'} colors={colors} />
              <Row label={t('service.playgrounds.booking.review.labels.time') || 'Time'} value={selectedSlot ? formatSlotLabel(selectedSlot, t) : '--'} colors={colors} />
              <Row label={t('service.playgrounds.booking.review.labels.players') || 'Players'} value={`${players}`} colors={colors} />
              <Row
                label={t('service.playgrounds.booking.review.labels.payment') || 'Payment'}
                value={paymentType === 'cash' ? 'Cash' : paymentType === 'cliq' ? 'CliQ' : '--'}
                colors={colors}
              />
            </View>

            {errorText ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  padding: 12,
                  borderRadius: 14,
                  backgroundColor: colors.errorSoft,
                }}
              >
                <AlertCircle size={18} color={colors.error} />
                <Text variant="caption" color={colors.error}>
                  {errorText}
                </Text>
              </View>
            ) : null}
          </View>
        </Card>
      )}

      <WizardFooter
        colors={colors}
        t={t}
        step={step}
        priceLabel={priceLabel}
        submitting={submitting}
        bookingSuccess={bookingSuccess}
        disableNext={disableNext}
        onBack={onBack}
        onNext={() => {
          if (bookingSuccess) {
            setStep(0);
            return;
          }
          onNext();
        }}
        onConfirm={onConfirm}
      />

      {/* ✅ Acceptance overlay after success */}
      {bookingSuccess ? (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.55)',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 18,
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 520,
              borderRadius: 22,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
              padding: 16,
            }}
          >
            <View style={{ alignItems: 'center', gap: 10 }}>
              <View
                style={{
                  height: 56,
                  width: 56,
                  borderRadius: 28,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: colors.successSoft || colors.surfaceElevated,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <CheckCircle2 size={28} color={colors.success || colors.accentOrange} />
              </View>

              <Text variant="h4" weight="bold" style={{ textAlign: 'center' }}>
                {t('service.playgrounds.booking.success.title') || 'Booking confirmed'}
              </Text>

              <Text variant="bodySmall" color={colors.textSecondary} style={{ textAlign: 'center' }}>
                {t('service.playgrounds.booking.success.overlayMessage') || 'Your booking was submitted successfully.'}
              </Text>

              {bookingResult?.booking_code ? (
                <View
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderRadius: 999,
                    backgroundColor: colors.surfaceElevated,
                    borderWidth: 1,
                    borderColor: colors.border,
                    marginTop: 2,
                  }}
                >
                  <Text variant="bodyLarge" weight="bold">
                    {bookingResult.booking_code}
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={{ marginTop: 14 }}>
              <Button fullWidth onPress={onGoToBookings}>
                {t('service.playgrounds.booking.success.goToBookings') || 'Go to My Bookings'}
              </Button>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}
