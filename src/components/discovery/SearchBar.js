import React, { useMemo } from 'react';
import { View } from 'react-native';
import { Search } from 'lucide-react-native';

import { Input } from '../ui/Input';
import { useTheme } from '../../theme/ThemeProvider';
import { makeADTheme } from '../../theme/academyDiscovery.styles';

export function SearchBar({ value, onChangeText, placeholder }) {
  const { colors, isDark } = useTheme();
  const theme = useMemo(() => makeADTheme(colors, isDark), [colors, isDark]);

  return (
    <View style={{ marginTop: theme.space.sm }}>
      <Input
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        leftIcon={<Search size={18} color={theme.text.muted} />}
        returnKeyType="search"
      />
    </View>
  );
}
