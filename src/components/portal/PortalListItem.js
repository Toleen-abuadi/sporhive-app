import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

export default function PortalListItem({ icon = 'chevron-right', label, value, onPress, tone = 'default' }) {
  const IconComponent = icon ? Feather : null;
  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={styles.container}>
      <View style={styles.left}>
        {IconComponent ? (
          <View style={styles.iconWrap}>
            <IconComponent name={icon} size={18} color="#5F5D73" />
          </View>
        ) : null}
        <View>
          <Text style={styles.label}>{label}</Text>
          {value ? <Text style={styles.value}>{value}</Text> : null}
        </View>
      </View>
      <Feather name="chevron-right" size={18} color={tone === 'danger' ? '#D54B4B' : '#B2B2C4'} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFEFFC',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#1B1B2D',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: '#F4F3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1B1B2D',
  },
  value: {
    fontSize: 12,
    color: '#8B8BA1',
    marginTop: 2,
  },
});
