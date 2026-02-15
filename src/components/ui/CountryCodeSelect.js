import React, { useMemo, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
  FlatList,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { useTranslation } from '../../services/i18n/i18n';
import { Text } from './Text';
import { borderRadius, spacing, fontSize } from '../../theme/tokens';

const COUNTRY_CODES = [
  { code: '+962', label: 'Jordan', flag: '🇯🇴', dialCode: '+962' },
  { code: '+966', label: 'Saudi Arabia', flag: '🇸🇦', dialCode: '+966' },
  { code: '+971', label: 'UAE', flag: '🇦🇪', dialCode: '+971' },
  { code: '+965', label: 'Kuwait', flag: '🇰🇼', dialCode: '+965' },
  { code: '+20', label: 'Egypt', flag: '🇪🇬', dialCode: '+20' },
  { code: '+961', label: 'Lebanon', flag: '🇱🇧', dialCode: '+961' },
  { code: '+970', label: 'Palestine', flag: '🇵🇸', dialCode: '+970' },
  { code: '+1', label: 'USA/Canada', flag: '🇺🇸', dialCode: '+1' },
  { code: '+44', label: 'United Kingdom', flag: '🇬🇧', dialCode: '+44' },
  { code: '+49', label: 'Germany', flag: '🇩🇪', dialCode: '+49' },
  { code: '+33', label: 'France', flag: '🇫🇷', dialCode: '+33' },
  { code: '+39', label: 'Italy', flag: '🇮🇹', dialCode: '+39' },
  { code: '+34', label: 'Spain', flag: '🇪🇸', dialCode: '+34' },
  { code: '+31', label: 'Netherlands', flag: '🇳🇱', dialCode: '+31' },
  { code: '+46', label: 'Sweden', flag: '🇸🇪', dialCode: '+46' },
  { code: '+47', label: 'Norway', flag: '🇳🇴', dialCode: '+47' },
  { code: '+45', label: 'Denmark', flag: '🇩🇰', dialCode: '+45' },
  { code: '+358', label: 'Finland', flag: '🇫🇮', dialCode: '+358' },
  { code: '+41', label: 'Switzerland', flag: '🇨🇭', dialCode: '+41' },
  { code: '+43', label: 'Austria', flag: '🇦🇹', dialCode: '+43' },
  { code: '+32', label: 'Belgium', flag: '🇧🇪', dialCode: '+32' },
  { code: '+351', label: 'Portugal', flag: '🇵🇹', dialCode: '+351' },
  { code: '+30', label: 'Greece', flag: '🇬🇷', dialCode: '+30' },
  { code: '+90', label: 'Turkey', flag: '🇹🇷', dialCode: '+90' },
  { code: '+972', label: 'Israel', flag: '🇮🇱', dialCode: '+972' },
  { code: '+82', label: 'South Korea', flag: '🇰🇷', dialCode: '+82' },
  { code: '+81', label: 'Japan', flag: '🇯🇵', dialCode: '+81' },
  { code: '+86', label: 'China', flag: '🇨🇳', dialCode: '+86' },
  { code: '+91', label: 'India', flag: '🇮🇳', dialCode: '+91' },
  { code: '+61', label: 'Australia', flag: '🇦🇺', dialCode: '+61' },
  { code: '+64', label: 'New Zealand', flag: '🇳🇿', dialCode: '+64' },
  { code: '+27', label: 'South Africa', flag: '🇿🇦', dialCode: '+27' },
  { code: '+234', label: 'Nigeria', flag: '🇳🇬', dialCode: '+234' },
  { code: '+254', label: 'Kenya', flag: '🇰🇪', dialCode: '+254' },
  { code: '+212', label: 'Morocco', flag: '🇲🇦', dialCode: '+212' },
  { code: '+216', label: 'Tunisia', flag: '🇹🇳', dialCode: '+216' },
  { code: '+213', label: 'Algeria', flag: '🇩🇿', dialCode: '+213' },
  { code: '+218', label: 'Libya', flag: '🇱🇾', dialCode: '+218' },
  { code: '+249', label: 'Sudan', flag: '🇸🇩', dialCode: '+249' },
  { code: '+967', label: 'Yemen', flag: '🇾🇪', dialCode: '+967' },
  { code: '+968', label: 'Oman', flag: '🇴🇲', dialCode: '+968' },
  { code: '+974', label: 'Qatar', flag: '🇶🇦', dialCode: '+974' },
  { code: '+973', label: 'Bahrain', flag: '🇧🇭', dialCode: '+973' },
  { code: '+963', label: 'Syria', flag: '🇸🇾', dialCode: '+963' },
  { code: '+964', label: 'Iraq', flag: '🇮🇶', dialCode: '+964' },
  { code: '+98', label: 'Iran', flag: '🇮🇷', dialCode: '+98' },
  { code: '+93', label: 'Afghanistan', flag: '🇦🇫', dialCode: '+93' },
  { code: '+92', label: 'Pakistan', flag: '🇵🇰', dialCode: '+92' },
  { code: '+94', label: 'Sri Lanka', flag: '🇱🇰', dialCode: '+94' },
  { code: '+880', label: 'Bangladesh', flag: '🇧🇩', dialCode: '+880' },
  { code: '+95', label: 'Myanmar', flag: '🇲🇲', dialCode: '+95' },
  { code: '+66', label: 'Thailand', flag: '🇹🇭', dialCode: '+66' },
  { code: '+84', label: 'Vietnam', flag: '🇻🇳', dialCode: '+84' },
];

function getInputLikeHeight() {
  // Input:
  // TextInput paddingVertical = spacing.md (top + bottom)
  // font size = fontSize.base
  // borderWidth = 1 (top + bottom)
  const border = 1;
  return spacing.md * 2 + fontSize.base + border * 2;
}

export function CountryCodeSelect({
  value,
  onChange,
  minWidth = 110,
  height,
  style, // ✅ NEW: allow parent to control marginBottom, etc.
}) {
  const { colors } = useTheme();
  const { t, isRTL } = useTranslation();

  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef(null);

  const computedHeight = height ?? getInputLikeHeight();

  const selectedCountry = useMemo(
    () => COUNTRY_CODES.find((c) => c.code === value) || COUNTRY_CODES[0],
    [value]
  );

  const filteredCountries = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return COUNTRY_CODES;
    return COUNTRY_CODES.filter(
      (c) =>
        c.label.toLowerCase().includes(query) ||
        c.code.includes(query) ||
        c.dialCode.includes(query)
    );
  }, [searchQuery]);

  return (
    <>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        style={[
          styles.codeButton,
          style, // ✅ apply external style
          {
            height: computedHeight,
            minWidth,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            flexDirection: isRTL ? 'row-reverse' : 'row',
          },
        ]}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={t?.('auth.fields.countryCode') || 'Country code'}
      >
        <Text
          variant="h4"
          style={{
            marginLeft: isRTL ? spacing.xs : 0,
            marginRight: isRTL ? 0 : spacing.xs,
          }}
        >
          {selectedCountry.flag}
        </Text>

        <Text variant="body" weight="bold" style={{ color: colors.textPrimary }}>
          {selectedCountry.code}
        </Text>

        <View
          style={[
            styles.chevron,
            {
              borderLeftColor: colors.textSecondary,
              borderBottomColor: colors.textSecondary,
              marginLeft: isRTL ? 0 : spacing.xs,
              marginRight: isRTL ? spacing.xs : 0,
              transform: [{ rotate: isRTL ? '135deg' : '-45deg' }],
            },
          ]}
        />
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
        statusBarTranslucent
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setOpen(false)}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
              },
            ]}
          >
            <View
              style={[
                styles.modalHeader,
                {
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                  borderBottomColor: colors.border,
                },
              ]}
            >
              <Text variant="h3" weight="bold">
                {t?.('auth.fields.countryCode') || 'Select Country'}
              </Text>

              <TouchableOpacity
                onPress={() => setOpen(false)}
                style={styles.closeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text variant="h4" color={colors.textSecondary}>
                  ✕
                </Text>
              </TouchableOpacity>
            </View>

            <View
              style={[
                styles.searchContainer,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                },
              ]}
            >
              <Text style={styles.searchIcon}>🔍</Text>

              <TextInput
                ref={searchInputRef}
                style={[
                  styles.searchInput,
                  {
                    color: colors.textPrimary,
                    textAlign: isRTL ? 'right' : 'left',
                  },
                ]}
                placeholder={t?.('common.search') || 'Search country...'}
                placeholderTextColor={colors.textTertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />

              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Text color={colors.textSecondary}>✕</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            <FlatList
              data={filteredCountries}
              keyExtractor={(item) => `${item.code}-${item.label}`}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.countryList}
              ItemSeparatorComponent={() => <View style={{ height: 2 }} />}
              renderItem={({ item }) => {
                const active = item.code === value;

                return (
                  <TouchableOpacity
                    onPress={() => {
                      onChange(item.code);
                      setOpen(false);
                    }}
                    style={[
                      styles.codeRow,
                      {
                        borderColor: active ? colors.accentOrange : 'transparent',
                        backgroundColor: active ? colors.accentOrange + '12' : 'transparent',
                        flexDirection: isRTL ? 'row-reverse' : 'row',
                      },
                    ]}
                    activeOpacity={0.65}
                  >
                    <Text
                      variant="h4"
                      style={{
                        marginLeft: isRTL ? spacing.sm : 0,
                        marginRight: isRTL ? 0 : spacing.sm,
                      }}
                    >
                      {item.flag}
                    </Text>

                    <View style={[styles.countryInfo, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                      <Text variant="body" weight="bold" style={{ color: colors.textPrimary }}>
                        {item.label}
                      </Text>
                      <Text variant="caption" color={colors.textSecondary}>
                        {item.dialCode}
                      </Text>
                    </View>

                    {active ? (
                      <View style={[styles.checkmark, { backgroundColor: colors.accentOrange }]}>
                        <Text color="#fff" weight="bold">
                          ✓
                        </Text>
                      </View>
                    ) : null}
                  </TouchableOpacity>
                );
              }}
            />

            <TouchableOpacity
              onPress={() => setOpen(false)}
              style={[
                styles.doneButton,
                {
                  backgroundColor: colors.accentOrange,
                  borderTopColor: colors.border,
                },
              ]}
            >
              <Text color="#fff" weight="bold" variant="bodyLarge">
                {t?.('common.done') || 'Done'}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  codeButton: {
    borderWidth: 1,
    borderRadius: borderRadius.md, // match Input
    paddingHorizontal: spacing.md, // match Input
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  chevron: {
    width: 8,
    height: 8,
    borderWidth: 2,
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: '80%',
  },
  modalHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: spacing.xs,
  },
  searchContainer: {
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    margin: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    height: 48,
    gap: spacing.sm,
  },
  searchIcon: {
    fontSize: 16,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    padding: 0,
  },
  countryList: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  codeRow: {
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  countryInfo: {
    flex: 1,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButton: {
    padding: spacing.lg,
    alignItems: 'center',
    borderTopWidth: 1,
  },
});
