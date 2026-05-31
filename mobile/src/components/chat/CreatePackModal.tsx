import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Modal, TouchableWithoutFeedback } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../store/themeStore';

interface Props {
  onClose: () => void;
}

export default function CreatePackModal({ onClose }: Props) {
  const t = useTheme();
  const [title, setTitle] = useState('');

  return (
    <Modal visible={true} transparent={true} animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.container, { backgroundColor: t.bg }]}>
              <View style={[styles.header, { borderBottomColor: t.border }]}>
                <Text style={[styles.title, { color: t.text }]}>Новый стикерпак</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <Feather name="x" size={20} color={t.muted} />
                </TouchableOpacity>
              </View>

              <View style={styles.body}>
                <Text style={[styles.label, { color: t.muted }]}>Название</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: t.inputBg, color: t.text, borderColor: t.border }]}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Мои стикеры"
                  placeholderTextColor={t.muted}
                />
                
                <View style={[styles.placeholderBox, { borderColor: t.border }]}>
                  <Feather name="upload" size={24} color={t.muted} />
                  <Text style={[styles.placeholderText, { color: t.muted }]}>
                    Создание стикерпаков через мобильное приложение в разработке.
                  </Text>
                </View>
              </View>

              <View style={[styles.footer, { borderTopColor: t.border }]}>
                <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
                  <Text style={{ color: t.muted }}>Отмена</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  disabled={true}
                  style={[styles.submitBtn, { backgroundColor: t.primary, opacity: 0.5 }]}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>Создать</Text>
                </TouchableOpacity>
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '90%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    padding: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 16,
  },
  placeholderBox: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    textAlign: 'center',
    marginTop: 8,
    fontSize: 13,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  submitBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    marginLeft: 12,
  },
});
