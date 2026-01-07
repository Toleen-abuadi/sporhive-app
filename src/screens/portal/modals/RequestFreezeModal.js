import React, { memo, useState } from 'react';
import { View, ScrollView, TextInput, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { PortalHeader, PortalBottomSheet } from '../../../components/portal';
import { useTranslation } from '../../../i18n';
import { colors, spacing, button, formatDate } from '../../../theme/portal.styles';

const RequestFreezeModal = memo(({ visible, onClose, onSubmit }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    startDate: new Date(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // One week from now
    reason: '',
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

  return (
    <PortalBottomSheet
      visible={visible}
      onClose={onClose}
      snapPoints={['80%']}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundDark }}>
        <PortalHeader
          title={t('portal.modals.requestFreeze.title')}
          subtitle={t('portal.modals.requestFreeze.subtitle')}
          showClose={true}
          onClose={onClose}
        />
        
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.screenPadding }}>
          <View style={{ marginBottom: spacing.md }}>
            <Text style={{ color: colors.textSecondary, marginBottom: spacing.xs, fontSize: 14 }}>
              {t('portal.modals.requestFreeze.startDate')}
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
              {t('portal.modals.requestFreeze.endDate')}
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
          
          <View style={{ marginBottom: spacing.xl }}>
            <Text style={{ color: colors.textSecondary, marginBottom: spacing.xs, fontSize: 14 }}>
              {t('portal.modals.requestFreeze.reason')} ({t('portal.modals.optional')})
            </Text>
            <TextInput
              value={form.reason}
              onChangeText={(text) => setForm(prev => ({ ...prev, reason: text }))}
              placeholder={t('portal.modals.requestFreeze.reasonPlaceholder')}
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={4}
              style={{
                backgroundColor: colors.backgroundElevated,
                borderRadius: 8,
                padding: spacing.md,
                color: colors.textPrimary,
                borderWidth: 1,
                borderColor: colors.borderMedium,
                textAlignVertical: 'top',
                minHeight: 100,
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
                {t('portal.modals.requestFreeze.submit')}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </PortalBottomSheet>
  );
});

RequestFreezeModal.displayName = 'RequestFreezeModal';

export default RequestFreezeModal;