import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

export default function PortalCard({ title, subtitle, children, style, accent = ['#F9F8FF', '#FFFFFF'] }) {
  return (
    <Animated.View entering={FadeInUp.duration(400)} style={[styles.card, style]}>
      <LinearGradient colors={accent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradient}>
        {title ? (
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
        ) : null}
        {children ? <View style={styles.body}>{children}</View> : null}
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    shadowColor: '#1B1B2D',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
    overflow: 'hidden',
  },
  gradient: {
    padding: 20,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1B1B2D',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: '#8C8CA3',
  },
  body: {
    gap: 10,
  },
});
