import React from 'react';
import { View, Image, TouchableOpacity, StyleSheet, Modal, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface Props {
  src: string;
  alt?: string;
  onClose: () => void;
}

export default function MediaViewer({ src, onClose }: Props) {
  return (
    <Modal visible={true} transparent={true} animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.container} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="x" size={24} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
        <Image
          source={{ uri: src }}
          style={styles.image}
          resizeMode="contain"
        />
      </TouchableOpacity>
    </Modal>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    zIndex: 10,
  },
  image: {
    width: width * 0.9,
    height: height * 0.9,
  },
});
