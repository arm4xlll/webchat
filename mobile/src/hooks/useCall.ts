import { useEffect, useRef, useState } from 'react';
import { Room, RoomEvent, Track, RemoteTrack } from 'livekit-client';
import { useCallStore } from '../store/callStore';
import { endCall } from '../api/calls';

export function useCall() {
  const room = useRef<Room | null>(null);
  const status = useCallStore(s => s.status);
  const token = useCallStore(s => s.token);
  const wsUrl = useCallStore(s => s.wsUrl);
  const conversationId = useCallStore(s => s.conversationId);
  const storeEnd = useCallStore(s => s.endCall);

  const [isMuted, setIsMuted] = useState(false);
  const [remoteCount, setRemoteCount] = useState(0);

  // Keep a ref to conversationId so event callbacks aren't stale
  const convIdRef = useRef<string | null>(null);
  convIdRef.current = conversationId;

  const handleEnd = async () => {
    const convId = convIdRef.current;
    if (convId) {
      endCall(convId).catch(e => console.error('[Call] end failed', e));
    }
    room.current?.disconnect();
    room.current = null;
    storeEnd();
  };

  useEffect(() => {
    if (status !== 'active' || !token || !wsUrl) return;

    const r = new Room({
      adaptiveStream: true,
      dynacast: true,
      audioCaptureDefaults: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 48000,
        channelCount: 1,
      },
    });
    room.current = r;

    r.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
      // In React Native with WebRTC, audio tracks play automatically 
      // when subscribed, or we might need AudioSession configuration.
    });

    r.on(RoomEvent.ParticipantDisconnected, () => {
      setRemoteCount(r.remoteParticipants.size);
      if (r.remoteParticipants.size === 0) {
        handleEnd();
      }
    });

    r.on(RoomEvent.ParticipantConnected, () => {
      setRemoteCount(r.remoteParticipants.size);
    });

    r.on(RoomEvent.Disconnected, () => {
      storeEnd();
    });

    r.connect(wsUrl, token, { autoSubscribe: true })
      .then(async () => {
        await r.localParticipant.setMicrophoneEnabled(true);
        setRemoteCount(r.remoteParticipants.size);
        setIsMuted(false);
      })
      .catch(err => {
        console.error('[Call] connect failed', err);
        storeEnd();
      });

    return () => {
      r.removeAllListeners();
      r.disconnect();
      room.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, token, wsUrl]);

  const toggleMute = () => {
    const r = room.current;
    if (!r) return;
    const next = !isMuted;
    r.localParticipant.setMicrophoneEnabled(!next);
    setIsMuted(next);
  };

  return { isMuted, toggleMute, remoteCount, handleEnd };
}
