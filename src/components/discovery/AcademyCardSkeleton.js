import React, { useMemo } from 'react';
import { View } from 'react-native';

import { Skeleton } from '../ui/Skeleton';
import { useTheme } from '../../theme/ThemeProvider';
import { makeADTheme } from '../../theme/academyDiscovery.styles';

export function AcademyCardSkeleton() {
  const { colors, isDark } = useTheme();
  const theme = useMemo(() => makeADTheme(colors, isDark), [colors, isDark]);

  return (
    <View
      style={{
        borderRadius: theme.radius.lg,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: theme.hairline,
        backgroundColor: theme.surface1,
      }}
    >
      <Skeleton height={140} radius={0} />
      <View style={{ padding: theme.space.md, gap: theme.space.sm }}>
        <Skeleton height={18} width="70%" />
        <Skeleton height={14} width="45%" />
        <View style={{ flexDirection: 'row', gap: theme.space.sm }}>
          <Skeleton height={32} width="40%" radius={12} />
          <Skeleton height={32} width="40%" radius={12} />
        </View>
      </View>
    </View>
  );
}
