import React, { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

function TabIcon({ name, focused }) {
  const scale = useSharedValue(focused ? 1 : 0.92);

  useEffect(() => {
    scale.value = withTiming(focused ? 1 : 0.92, { duration: 220 });
  }, [focused, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.iconWrap, focused && styles.iconWrapActive, animatedStyle]}>
      <Feather name={name} size={18} color={focused ? '#FFFFFF' : '#6F6E86'} />
    </Animated.View>
  );
}

function TabBarBackground() {
  return (
    <View style={StyleSheet.absoluteFill}>
      <LinearGradient colors={['#FFFFFF', '#F3F2FF']} style={styles.tabBackground} />
    </View>
  );
}

export default function PortalTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarBackground: () => <TabBarBackground />,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => <TabIcon name="user" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="renewals"
        options={{
          title: 'Renewals',
          tabBarIcon: ({ focused }) => <TabIcon name="repeat" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ focused }) => <TabIcon name="grid" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    borderTopWidth: 0,
    elevation: 0,
    height: 74,
    paddingTop: 12,
    paddingBottom: 14,
    paddingHorizontal: 16,
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    borderRadius: 24,
    shadowColor: '#1B1B2D',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6F6E86',
    marginTop: 6,
  },
  tabBackground: {
    flex: 1,
    borderRadius: 24,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F0FA',
  },
  iconWrapActive: {
    backgroundColor: '#5B5CF6',
  },
});
