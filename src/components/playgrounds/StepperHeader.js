import { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { getPlaygroundsTheme } from '../../theme/playgroundsTheme';

export const StepperHeader = ({ steps = [], currentStep = 0 }) => {
  const scheme = useColorScheme();
  const theme = getPlaygroundsTheme(scheme);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const percentage = steps.length > 1 ? (currentStep / (steps.length - 1)) : 0;

  useEffect(() => {
    Animated.spring(progressAnim, {
      toValue: percentage,
      friction: 8,
      tension: 60,
      useNativeDriver: false,
    }).start();
  }, [percentage, progressAnim]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const currentLabel = useMemo(() => steps[currentStep] || 'Details', [steps, currentStep]);

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.colors.textPrimary }]}>{currentLabel}</Text>
      <View style={[styles.track, { backgroundColor: theme.colors.border }]}>
        <Animated.View style={[styles.progress, { width: progressWidth, backgroundColor: theme.colors.primary }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  label: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  track: {
    height: 6,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progress: {
    height: 6,
    borderRadius: 999,
  },
});
