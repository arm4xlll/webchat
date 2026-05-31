import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useCallStore } from '../../store/callStore';
import { answerCall } from '../../api/calls';
import { useTheme } from '../../store/themeStore';
import UserAvatar from '../common/UserAvatar';

export default function IncomingCallModal() {
  const t = useTheme();
  const status = useCallStore(s => s.status);
  const conversationId = useCallStore(s => s.conversationId);
  const callerName = useCallStore(s => s.callerName);
  const callerAvatar = useCallStore(s => s.callerAvatar);
  const activate = useCallStore(s => s.activate);
  const endCall = useCallStore(s => s.endCall);

  if (status !== 'incoming' || !conversationId) return null;

  const handleAccept = async () => {
    try {
      const resp = await answerCall(conversationId, true);
      if (resp) activate(resp.token, resp.wsUrl);
    } catch (e) {
      console.error('[Call] accept failed', e);
      endCall();
    }
  };

  const handleDecline = async () => {
    try {
      await answerCall(conversationId, false);
    } catch (e) {
      console.error('[Call] decline failed', e);
    } finally {
      endCall();
    }
  };

  return (
    <Modal visible={true} transparent={true} animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: t.bg }]}>
          <UserAvatar name={callerName ?? '?'} avatarUrl={callerAvatar ?? undefined} size="xl" />

          <View style={styles.textContainer}>
            <Text style={[styles.name, { color: t.text }]}>{callerName}</Text>
            <Text style={[styles.subtitle, { color: t.muted }]}>Входящий звонок...</Text>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity onPress={handleDecline} style={[styles.btn, { backgroundColor: '#f43f5e' }]}>
              <Feather name="phone-off" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleAccept} style={[styles.btn, { backgroundColor: '#22c55e' }]}>
              <Feather name="phone" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: 280,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    elevation: 10,
  },
  textContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 32,
    marginTop: 24,
  },
  btn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  }
});
