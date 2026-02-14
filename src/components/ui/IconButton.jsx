import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { getColors } from '../../theme/colors';

/**
 * IconButton
 *
 * icon can be:
 * 1) string -> Feather icon name (e.g. "x", "chevron-left")
 * 2) component -> lucide-react-native icon component (e.g. X, ChevronLeft)
 * 3) element -> <X size={20} />
 */
export function IconButton({
  icon,
  onPress,
  mode = 'light',
  style,
  size = 20,
  color,
  disabled = false,
  accessibilityLabel,
  testID,
}) {
  const colors = getColors(mode);
  const iconColor = color || colors.textPrimary;

  const renderIcon = () => {
    // React element passed directly
    if (React.isValidElement(icon)) return icon;

    // Component passed (e.g. lucide icon component)
    if (typeof icon === 'function') {
      const IconComp = icon;
      return <IconComp size={size} color={iconColor} />;
    }

    // Feather name string
    if (typeof icon === 'string' && icon.trim().length > 0) {
      return <Feather name={icon} size={size} color={iconColor} />;
    }

    return null;
  };

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button,
        {
          borderColor: colors.border,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      <View style={styles.iconWrap}>{renderIcon()}</View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
