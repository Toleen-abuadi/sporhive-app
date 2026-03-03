import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';

export function ImageViewer({ images = [], imageIndex = 0, visible = false, onRequestClose }) {
  if (!visible) return null;
  const uri = images?.[imageIndex]?.uri;
  const source = uri ? { uri } : null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onRequestClose}>
      <Pressable style={styles.backdrop} onPress={onRequestClose}>
        {source ? <Image source={source} style={styles.image} contentFit="contain" /> : <View style={styles.image} />}
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  image: {
    width: '100%',
    height: '100%',
  },
});

