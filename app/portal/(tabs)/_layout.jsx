import { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { View, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { useTranslation } from '../../../src/services/i18n/i18n';

const TAB_HEIGHT = 68;

const iconMap = {
  home: 'home',
  profile: 'person',
  renewals: 'calendar',
  more: 'grid',
};

function PortalTabBar({ state, descriptors, navigation }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = Dimensions.get('window');
  const tabWidth = width / state.routes.length;
  const indicatorX = useSharedValue(state.index * tabWidth);

  useEffect(() => {
    indicatorX.value = withSpring(state.index * tabWidth, { damping: 18, stiffness: 140 });
  }, [indicatorX, state.index, tabWidth]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value + 12 }],
  }));

  return (
    <View style={[styles.tabContainer, { paddingBottom: insets.bottom + 12 }]}
    >
      <BlurView intensity={60} tint="light" style={styles.blur}
      >
        <LinearGradient
          colors={[`${colors.surface}F2`, `${colors.surface}CC`]}
          style={[styles.gradient, { borderColor: colors.border }]}
        >
          <Animated.View
            style={[
              styles.indicator,
              {
                width: tabWidth - 24,
                backgroundColor: colors.accentOrange + '22',
              },
              indicatorStyle,
            ]}
          />
          <View style={styles.row}>
            {state.routes.map((route, index) => {
              const { options } = descriptors[route.key];
              const label =
                options.tabBarLabel ?? options.title ?? route.name;
              const isFocused = state.index === index;
              const iconName = iconMap[route.name] || 'ellipse';

              const onPress = () => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                });

                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              };

              return (
                <TouchableOpacity
                  key={route.key}
                  onPress={onPress}
                  style={styles.tab}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={isFocused ? iconName : `${iconName}-outline`}
                    size={22}
                    color={isFocused ? colors.accentOrange : colors.textMuted}
                  />
                  <Animated.Text
                    style={{
                      marginTop: 4,
                      fontSize: 11,
                      color: isFocused ? colors.textPrimary : colors.textMuted,
                    }}
                  >
                    {label}
                  </Animated.Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </LinearGradient>
      </BlurView>
    </View>
  );
}

export default function PortalTabsLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <PortalTabBar {...props} />}
    >
      <Tabs.Screen name="home" options={{ title: t('portal.tabs.home') }} />
      <Tabs.Screen name="profile" options={{ title: t('portal.tabs.profile') }} />
      <Tabs.Screen name="renewals" options={{ title: t('portal.tabs.renewals') }} />
      <Tabs.Screen name="more" options={{ title: t('portal.tabs.more') }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
  },
  blur: {
    borderRadius: 28,
    overflow: 'hidden',
  },
  gradient: {
    borderRadius: 28,
    borderWidth: 1,
    paddingVertical: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tab: {
    flex: 1,
    height: TAB_HEIGHT - 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicator: {
    position: 'absolute',
    top: 8,
    bottom: 8,
    borderRadius: 20,
  },
});
