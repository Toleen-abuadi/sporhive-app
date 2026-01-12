import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';

export default function PortalEmptyState({ icon = 'inbox', title, description }) {
  return (
    <Animated.View entering={FadeInUp.duration(450)} style={styles.container}>
      <View style={styles.iconWrap}>
        <Feather name={icon} size={26} color="#6D6C7F" />
      </View>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 18,
    borderRadius: 20,
    backgroundColor: '#F8F8FF',
    borderWidth: 1,
    borderColor: '#ECEBFA',
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#1B1B2D',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1B1B2D',
  },
  description: {
    marginTop: 6,
    fontSize: 13,
    textAlign: 'center',
    color: '#7C7C91',
  },
});
