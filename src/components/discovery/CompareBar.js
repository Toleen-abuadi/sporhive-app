import React, { memo, useEffect, useMemo, useRef } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { useTheme } from '../../theme/ThemeProvider';
import { useI18n } from '../../services/i18n/i18n';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Text } from '../ui/Text';
import { SmartImage } from '../ui/SmartImage';
import { makeADTheme } from '../../theme/academyDiscovery.styles';

export const CompareBar = memo(function CompareBar({
  items = [],
  onCompare,
  onClear,
  onRemoveItem,
}) {
  const { colors, isDark } = useTheme();
  const { t, isRTL } = useI18n();
  const theme = useMemo(() => makeADTheme(colors, isDark), [colors, isDark]);

  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(22)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [opacity, translateY]);

  if (items.length < 2) return null;

  const previews = items.slice(0, 3);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      <Card
        padding="small"
        style={[
          styles.card,
          {
            borderColor: theme.hairline,
            backgroundColor: theme.surface2,
          },
        ]}
      >
        <View style={[styles.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}> 
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.thumbRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            style={styles.thumbScroll}
          >
            {previews.map((item) => (
              <View key={item.compareId} style={styles.thumbItem}>
                <View style={[styles.thumbWrap, { borderColor: theme.hairline, backgroundColor: theme.surface1 }]}> 
                  <SmartImage
                    source={item.coverUri || item.logoUri}
                    fallbackSource={item.logoUri}
                    style={StyleSheet.absoluteFillObject}
                    borderRadius={10}
                  />
                </View>

                <Pressable
                  onPress={() => onRemoveItem?.(item.compareId)}
                  style={({ pressed }) => [
                    styles.removeBadge,
                    {
                      opacity: pressed ? 0.8 : 1,
                      backgroundColor: theme.surface0,
                      borderColor: theme.hairline,
                      right: isRTL ? undefined : -4,
                      left: isRTL ? -4 : undefined,
                    },
                  ]}
                >
                  <Feather name="x" size={11} color={theme.text.secondary} />
                </Pressable>
              </View>
            ))}
          </ScrollView>

          <View style={[styles.actionsWrap, { alignItems: isRTL ? 'flex-start' : 'flex-end' }]}> 
            <Button size="small" onPress={onCompare} style={styles.compareBtn}>
              {t('service.academy.discovery.compare.action', { count: items.length })}
            </Button>

            <Pressable onPress={onClear} style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}> 
              <Text variant="caption" weight="semibold" color={theme.text.secondary}>
                {t('service.academy.discovery.compare.clear')}
              </Text>
            </Pressable>
          </View>
        </View>
      </Card>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 18,
    overflow: 'visible',
  },
  row: {
    alignItems: 'center',
    gap: 10,
  },
  thumbScroll: {
    flex: 1,
  },
  thumbRow: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  thumbItem: {
    position: 'relative',
  },
  thumbWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
  },
  removeBadge: {
    position: 'absolute',
    top: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  actionsWrap: {
    justifyContent: 'center',
    gap: 6,
  },
  compareBtn: {
    minHeight: 36,
    paddingHorizontal: 12,
  },
});

