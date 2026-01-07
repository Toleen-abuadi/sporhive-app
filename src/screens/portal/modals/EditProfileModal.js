import React, { memo, useState } from 'react';
import { View, ScrollView, TextInput, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PortalHeader, PortalBottomSheet } from '../../../components/portal';
import { useTranslation } from '../../../i18n';
import { colors, spacing, button } from '../../../theme/portal.styles';

const EditProfileModal = memo(({ visible, onClose, onSubmit }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    address: '',
  });

  const handleSubmit = () => {
    onSubmit(form);
    onClose();
  };

  const renderFormField = (label, value, key, placeholder, keyboardType = 'default') => (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={{ color: colors.textSecondary, marginBottom: spacing.xs, fontSize: 14 }}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={(text) => setForm(prev => ({ ...prev, [key]: text }))}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        keyboardType={keyboardType}
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
  );

  return (
    <PortalBottomSheet
      visible={visible}
      onClose={onClose}
      snapPoints={['90%']}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundDark }}>
        <PortalHeader
          title={t('portal.modals.editProfile.title')}
          subtitle={t('portal.modals.editProfile.subtitle')}
          showClose={true}
          onClose={onClose}
        />
        
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.screenPadding }}>
          {renderFormField(
            t('portal.modals.editProfile.firstName'),
            form.firstName,
            'firstName',
            t('portal.modals.editProfile.firstNamePlaceholder')
          )}
          
          {renderFormField(
            t('portal.modals.editProfile.lastName'),
            form.lastName,
            'lastName',
            t('portal.modals.editProfile.lastNamePlaceholder')
          )}
          
          {renderFormField(
            t('portal.modals.editProfile.phone'),
            form.phone,
            'phone',
            t('portal.modals.editProfile.phonePlaceholder'),
            'phone-pad'
          )}
          
          {renderFormField(
            t('portal.modals.editProfile.email'),
            form.email,
            'email',
            t('portal.modals.editProfile.emailPlaceholder'),
            'email-address'
          )}
          
          {renderFormField(
            t('portal.modals.editProfile.address'),
            form.address,
            'address',
            t('portal.modals.editProfile.addressPlaceholder')
          )}
          
          <View style={{ flexDirection: 'row', marginTop: spacing.xl }}>
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
                {t('portal.modals.save')}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </PortalBottomSheet>
  );
});

EditProfileModal.displayName = 'EditProfileModal';

export default EditProfileModal;