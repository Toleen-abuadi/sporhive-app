import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

export default function PortalHeader({ title, subtitle, avatar }) {
  return (
    <Animated.View entering={FadeInDown.duration(500)} style={styles.container}>
      <LinearGradient
        colors={['#F6F4FF', '#FFFFFF']}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.textBlock}>
          <Text style={styles.eyebrow}>Player Portal</Text>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        <View style={styles.avatarWrap}>
          {avatar ? <Image source={{ uri: avatar }} style={styles.avatar} /> : <View style={styles.avatarFallback} />}
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 18,
  },
  gradient: {
    borderRadius: 28,
    paddingVertical: 20,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#1B1B2D',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 6,
  },
  textBlock: {
    flex: 1,
    paddingRight: 16,
  },
  eyebrow: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color: '#8C8CA3',
    marginBottom: 6,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1B1B2D',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: '#6B6B7C',
  },
  avatarWrap: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: '#EFEFFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 18,
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: '#D8D6F0',
  },
});
