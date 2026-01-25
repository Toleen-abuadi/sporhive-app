import React, { useMemo } from 'react';
import { Map, List } from 'lucide-react-native';

import { SegmentedControl } from '../ui/SegmentedControl';
import { useTheme } from '../../theme/ThemeProvider';
import { makeADTheme } from '../../theme/academyDiscovery.styles';

export function SegmentedViewToggle({ value, onChange, mapLabel, listLabel }) {
  const { colors, isDark } = useTheme();
  const theme = useMemo(() => makeADTheme(colors, isDark), [colors, isDark]);

  const options = useMemo(
    () => [
      {
        value: 'map',
        label: mapLabel,
        icon: (active, c) => <Map size={16} color={active ? c.accentOrange : c.textMuted} />,
      },
      {
        value: 'list',
        label: listLabel,
        icon: (active, c) => <List size={16} color={active ? c.accentOrange : c.textMuted} />,
      },
    ],
    [listLabel, mapLabel]
  );

  return (
    <SegmentedControl
      value={value}
      onChange={onChange}
      options={options}
      style={{ marginTop: theme.space.md }}
    />
  );
}
