import { useEffect, useRef, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { useAuthStore } from '../store/authStore';
import api from '../api/client';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export function usePushNotifications() {
  const isAuthenticated = useAuthStore(s => !!s.accessToken);
  const [showBanner, setShowBanner] = useState(false);
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    if (!isAuthenticated) return;

    const checkAndRequest = async () => {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        setShowBanner(true);
        return;
      }
      
      try {
        const projectId = 'your-expo-project-id'; // To be replaced in actual expo config
        const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
        
        // Send to backend - adapting to WebPush format temporarily or sending raw expo token
        await api.post('/push/subscribe', {
          endpoint: tokenData.data, // Expo push token
          p256dh: 'expo',
          auth: 'expo'
        }).catch(() => {});
      } catch (e) {
        console.log('Error getting push token', e);
      }
    };

    checkAndRequest();

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      // Handle notification tap
    });

    return () => {
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [isAuthenticated]);

  const requestPermission = async () => {
    setShowBanner(false);
    const { status } = await Notifications.requestPermissionsAsync();
    if (status === 'granted') {
       const tokenData = await Notifications.getExpoPushTokenAsync();
       await api.post('/push/subscribe', {
          endpoint: tokenData.data,
          p256dh: 'expo',
          auth: 'expo'
       }).catch(() => {});
    }
  };

  return { showBanner, requestPermission };
}
