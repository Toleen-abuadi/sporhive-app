import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { BottomSheetModal } from '../ui/BottomSheetModal';
import { Button } from '../ui/Button';
import { Text } from '../ui/Text';
import { Chip } from '../ui/Chip';
import { Input } from '../ui/Input';
import { Divider } from '../ui/Divider';
import { useTheme } from '../../theme/ThemeProvider';
import { useI18n } from '../../services/i18n/i18n';

export function PortalFilterSheet({
  visible,
  onClose,
  onApply,
  onClear,
  title,
  subtitle,
  filters,
  statusOptions = [],
  showDateRange = false,
}) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const [draft, setDraft] = useState(filters);

  useEffect(() => {
    if (visible) {
      setDraft(filters);
    }
  }, [filters, visible]);

  const handleStatus = (value) => {
    setDraft((prev) => ({ ...prev, status: value }));
  };

  const resolvedTitle = title || t('portal.filters.title');
  const resolvedSubtitle = subtitle || t('portal.filters.subtitle');

  return (
    <BottomSheetModal visible={visible} onClose={onClose}>
      <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
        <View style={{ alignItems: 'center', paddingVertical: 10 }}>
          <View style={{ width: 48, height: 5, borderRadius: 999, backgroundColor: colors.border }} />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Text variant="h4" weight="bold" color={colors.textPrimary}>
              {resolvedTitle}
            </Text>
            <Text variant="caption" color={colors.textSecondary}>
              {resolvedSubtitle}
            </Text>
          </View>
          <Button variant="ghost" onPress={onClose}>
            <Text variant="caption" weight="bold" color={colors.textPrimary}>
              {t('portal.common.close')}
            </Text>
          </Button>
        </View>

        <View style={{ marginTop: 20, gap: 16 }}>
          {statusOptions.length ? (
            <View style={{ gap: 10 }}>
              <Text variant="caption" weight="bold" color={colors.textPrimary}>
                {t('portal.filters.statusLabel')}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {statusOptions.map((option) => (
                  <Chip
                    key={option.value}
                    label={option.label}
                    selected={draft?.status === option.value}
                    onPress={() => handleStatus(option.value)}
                  />
                ))}
              </View>
            </View>
          ) : null}

          {showDateRange ? (
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Input
                  label={t('portal.filters.fromLabel')}
                  value={draft?.from}
                  onChangeText={(value) => setDraft((prev) => ({ ...prev, from: value }))}
                  placeholder={t('portal.filters.datePlaceholder')}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label={t('portal.filters.toLabel')}
                  value={draft?.to}
                  onChangeText={(value) => setDraft((prev) => ({ ...prev, to: value }))}
                  placeholder={t('portal.filters.datePlaceholder')}
                />
              </View>
            </View>
          ) : null}

          <Divider />

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Button variant="secondary" style={{ flex: 1 }} onPress={onClear}>
              <Text variant="caption" weight="bold" color={colors.textPrimary}>
                {t('portal.filters.clear')}
              </Text>
            </Button>
            <Button style={{ flex: 1 }} onPress={() => onApply?.(draft)}>
              <Text variant="caption" weight="bold" color={colors.white}>
                {t('portal.filters.apply')}
              </Text>
            </Button>
          </View>
        </View>
      </View>
    </BottomSheetModal>
  );
}
