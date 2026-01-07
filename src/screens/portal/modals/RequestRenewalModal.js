import React, { memo, useState } from 'react';
import { View, ScrollView, TextInput, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { PortalHeader, PortalBottomSheet } from '../../../components/portal';
import { useTranslation } from '../../../i18n';
import { colors, spacing, button, formatDate } from '../../../theme/portal.styles';

const RequestRenewalModal = memo(({ visible, onClose, onSubmit }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    renewalType: 'subscription',
    group: '',
    course: '',
    startDate: new Date(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    sessions: '',
    note: '',
    showStartPicker: false,
    showEndPicker: false,
  });

  const handleDateChange = (event, selectedDate, type) => {
    if (selectedDate) {
      setForm(prev => ({ 
        ...prev, 
        [type]: selectedDate,
        [`show${type.charAt(0).toUpperCase() + type.slice(1)}Picker`]: false 
      }));
    } else {
      setForm(prev => ({ 
        ...prev, 
        [`show${type.charAt(0).toUpperCase() + type.slice(1)}Picker`]: false 
      }));
    }
  };

  const handleSubmit = () => {
    onSubmit(form);
    onClose();
  };

  const renderTypeSelector = () => (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={{ color: colors.textSecondary, marginBottom: spacing.xs, fontSize: 14 }}>
        {t('portal.modals.requestRenewal.type')}
      </Text>
      <View style={{ flexDirection: 'row' }}>
        {['subscription', 'course'].map((type) => (
          <TouchableOpacity
            key={type}
            onPress={() => setForm(prev => ({ ...prev, renewalType: type }))}
            style={{
              flex: 1,
              padding: spacing.md,
              backgroundColor: form.renewalType === type ? colors.primary : colors.backgroundElevated,
              borderRadius: 8,
              marginRight: type === 'subscription' ? spacing.sm : 0,
              borderWidth: 1,
              borderColor: form.renewalType === type ? colors.primary : colors.borderMedium,
              alignItems: 'center',
            }}
          >
            <Text style={{
              color: form.renewalType === type ? colors.textInverted : colors.textPrimary,
              fontWeight: form.renewalType === type ? '600' : '400',
            }}>
              {t(`portal.modals.requestRenewal.${type}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <PortalBottomSheet
      visible={visible}
      onClose={onClose}
      snapPoints={['85%']}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundDark }}>
        <PortalHeader
          title={t('portal.modals.requestRenewal.title')}
          subtitle={t('portal.modals.requestRenewal.subtitle')}
          showClose={true}
          onClose={onClose}
        />
        
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.screenPadding }}>
          {renderTypeSelector()}
          
          <View style={{ marginBottom: spacing.md }}>
            <Text style={{ color: colors.textSecondary, marginBottom: spacing.xs, fontSize: 14 }}>
              {t('portal.modals.requestRenewal.group')}
            </Text>
            <TextInput
              value={form.group}
              onChangeText={(text) => setForm(prev => ({ ...prev, group: text }))}
              placeholder={t('portal.modals.requestRenewal.groupPlaceholder')}
              placeholderTextColor={colors.textTertiary}
              keyboardType="number-pad"
              style={{
                backgroundColor: colors.backgroundElevated,
                borderRadius: 8,
                padding: spacing.md,
                color: colors.textPrimary,
                borderWidth: 1,
                borderColor: colors.borderMedium,
              }}
            />
          </View>
          
          {form.renewalType === 'course' && (
            <View style={{ marginBottom: spacing.md }}>
              <Text style={{ color: colors.textSecondary, marginBottom: spacing.xs, fontSize: 14 }}>
                {t('portal.modals.requestRenewal.course')}
              </Text>
              <TextInput
                value={form.course}
                onChangeText={(text) => setForm(prev => ({ ...prev, course: text }))}
                placeholder={t('portal.modals.requestRenewal.coursePlaceholder')}
                placeholderTextColor={colors.textTertiary}
                keyboardType="number-pad"
                style={{
                  backgroundColor: colors.backgroundElevated,
                  borderRadius: 8,
                  padding: spacing.md,
                  color: colors.textPrimary,
                  borderWidth: 1,
                  borderColor: colors.borderMedium,
                }}
              />
            </View>
          )}
          
          <View style={{ marginBottom: spacing.md }}>
            <Text style={{ color: colors.textSecondary, marginBottom: spacing.xs, fontSize: 14 }}>
              {t('portal.modals.requestRenewal.startDate')}
            </Text>
            <TouchableOpacity
              onPress={() => setForm(prev => ({ ...prev, showStartPicker: true }))}
              style={{
                backgroundColor: colors.backgroundElevated,
                borderRadius: 8,
                padding: spacing.md,
                borderWidth: 1,
                borderColor: colors.borderMedium,
              }}
            >
              <Text style={{ color: colors.textPrimary }}>
                {formatDate(form.startDate)}
              </Text>
            </TouchableOpacity>
            {form.showStartPicker && (
              <DateTimePicker
                value={form.startDate}
                mode="date"
                display="default"
                onChange={(event, date) => handleDateChange(event, date, 'startDate')}
                minimumDate={new Date()}
              />
            )}
          </View>
          
          <View style={{ marginBottom: spacing.md }}>
            <Text style={{ color: colors.textSecondary, marginBottom: spacing.xs, fontSize: 14 }}>
              {t('portal.modals.requestRenewal.endDate')}
            </Text>
            <TouchableOpacity
              onPress={() => setForm(prev => ({ ...prev, showEndPicker: true }))}
              style={{
                backgroundColor: colors.backgroundElevated,
                borderRadius: 8,
                padding: spacing.md,
                borderWidth: 1,
                borderColor: colors.borderMedium,
              }}
            >
              <Text style={{ color: colors.textPrimary }}>
                {formatDate(form.endDate)}
              </Text>
            </TouchableOpacity>
            {form.showEndPicker && (
              <DateTimePicker
                value={form.endDate}
                mode="date"
                display="default"
                onChange={(event, date) => handleDateChange(event, date, 'endDate')}
                minimumDate={form.startDate}
              />
            )}
          </View>
          
          <View style={{ marginBottom: spacing.md }}>
            <Text style={{ color: colors.textSecondary, marginBottom: spacing.xs, fontSize: 14 }}>
              {t('portal.modals.requestRenewal.sessions')} ({t('portal.modals.optional')})
            </Text>
            <TextInput
              value={form.sessions}
              onChangeText={(text) => setForm(prev => ({ ...prev, sessions: text }))}
              placeholder={t('portal.modals.requestRenewal.sessionsPlaceholder')}
              placeholderTextColor={colors.textTertiary}
              keyboardType="number-pad"
              style={{
                backgroundColor: colors.backgroundElevated,
                borderRadius: 8,
                padding: spacing.md,
                color: colors.textPrimary,
                borderWidth: 1,
                borderColor: colors.borderMedium,
              }}
            />
          </View>
          
          <View style={{ marginBottom: spacing.xl }}>
            <Text style={{ color: colors.textSecondary, marginBottom: spacing.xs, fontSize: 14 }}>
              {t('portal.modals.requestRenewal.note')} ({t('portal.modals.optional')})
            </Text>
            <TextInput
              value={form.note}
              onChangeText={(text) => setForm(prev => ({ ...prev, note: text }))}
              placeholder={t('portal.modals.requestRenewal.notePlaceholder')}
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={3}
              style={{
                backgroundColor: colors.backgroundElevated,
                borderRadius: 8,
                padding: spacing.md,
                color: colors.textPrimary,
                borderWidth: 1,
                borderColor: colors.borderMedium,
                textAlignVertical: 'top',
                minHeight: 80,
              }}
            />
          </View>
          
          <View style={{ flexDirection: 'row' }}>
            <TouchableOpacity
              style={[button.secondary, { flex: 1, marginRight: spacing.md }]}
              onPress={onClose}
            >
              <Text style={button.secondaryText}>
                {t('portal.modals.cancel')}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[button.primary, { flex: 1 }]}
              onPress={handleSubmit}
            >
              <Text style={button.primaryText}>
                {t('portal.modals.requestRenewal.submit')}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </PortalBottomSheet>
  );
});

RequestRenewalModal.displayName = 'RequestRenewalModal';

export default RequestRenewalModal;