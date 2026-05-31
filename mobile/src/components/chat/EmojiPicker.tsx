import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, TouchableWithoutFeedback } from 'react-native';
import { useTheme } from '../../store/themeStore';

const EMOJIS = [
  '👍', '❤️', '😂', '😮', '😢', '😡',
  '🔥', '🎉', '💯', '👎', '😍', '🤔',
  '✅', '💪', '🙏', '👏', '😎', '🥰',
];

interface Props {
  x: number;
  y: number;
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export default function EmojiPicker({ x, y, onSelect, onClose }: Props) {
  const t = useTheme();

  return (
    <Modal visible={true} transparent={true} animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.container, { backgroundColor: t.bg, borderColor: t.border }]}>
              <View style={styles.grid}>
                {EMOJIS.map(e => (
                  <TouchableOpacity
                    key={e}
                    onPress={() => { onSelect(e); onClose(); }}
                    style={styles.cell}
                  >
                    <Text style={styles.emoji}>{e}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: 280,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    elevation: 5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  cell: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 24,
  },
});
