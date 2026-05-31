import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../store/themeStore';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

interface Action {
  label: string;
  icon: string;
  danger?: boolean;
  onPress: () => void;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  isOwn: boolean;
  onReact: (emoji: string) => void;
  onReply: () => void;
  onCopy: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onPin?: () => void;
}

export default function MessageContextMenu({ visible, onClose, isOwn, onReact, onReply, onCopy, onEdit, onDelete, onPin }: Props) {
  const t = useTheme();

  const actions: Action[] = [
    { label: 'Ответить', icon: 'corner-up-left', onPress: () => { onReply(); onClose(); } },
    { label: 'Копировать', icon: 'copy', onPress: () => { onCopy(); onClose(); } },
    ...(onPin ? [{ label: 'Закрепить', icon: 'pin' as any, onPress: () => { onPin(); onClose(); } }] : []),
    ...(isOwn && onEdit ? [{ label: 'Редактировать', icon: 'edit-2' as any, onPress: () => { onEdit(); onClose(); } }] : []),
    ...(isOwn && onDelete ? [{ label: 'Удалить', icon: 'trash-2' as any, danger: true, onPress: () => { onDelete(); onClose(); } }] : []),
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.sheet, { backgroundColor: t.card, borderColor: t.border }]}>
              {/* Quick reactions */}
              <View style={styles.reactions}>
                {QUICK_REACTIONS.map(emoji => (
                  <TouchableOpacity key={emoji} style={styles.reactionBtn} onPress={() => { onReact(emoji); onClose(); }}>
                    <Text style={styles.reactionEmoji}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={[styles.divider, { backgroundColor: t.border }]} />

              {/* Actions */}
              {actions.map((action) => (
                <TouchableOpacity key={action.label} style={styles.action} onPress={action.onPress} activeOpacity={0.7}>
                  <Feather name={action.icon as any} size={18} color={action.danger ? '#f87171' : t.textSoft} />
                  <Text style={[styles.actionLabel, { color: action.danger ? '#f87171' : t.text }]}>
                    {action.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 32 },
  sheet: { width: '100%', maxWidth: 320, borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  reactions: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 14, paddingHorizontal: 8 },
  reactionBtn: { padding: 4 },
  reactionEmoji: { fontSize: 28 },
  divider: { height: 1 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 15 },
  actionLabel: { fontSize: 16 },
});
