// MasarAI Notifications Hook
import { useEffect, useRef, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import {
  requestNotificationPermissions,
  scheduleDailyReminders,
  isNotificationsEnabled,
  setNotificationsEnabled,
  getScheduledCount,
} from '../services/notifications';

export function useNotifications() {
  const router = useRouter();
  const [enabled, setEnabled] = useState(true);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [scheduledCount, setScheduledCount] = useState(0);
  const notificationResponseListener = useRef<any>(null);
  const notificationReceivedListener = useRef<any>(null);

  // Initialize notifications
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      // Check current state
      const isEnabled = await isNotificationsEnabled();
      const granted = await requestNotificationPermissions();
      const count = await getScheduledCount();

      if (!mounted) return;

      setEnabled(isEnabled);
      setPermissionGranted(granted);
      setScheduledCount(count);

      // Schedule reminders if enabled and has permission
      if (isEnabled && granted) {
        await scheduleDailyReminders();
        const newCount = await getScheduledCount();
        if (mounted) setScheduledCount(newCount);
      }
    };

    init();

    // Only register listeners on native platforms
    if (Platform.OS !== 'web') {
      import('expo-notifications').then((Notifications) => {
        // Listen for notification taps
        notificationResponseListener.current = Notifications.addNotificationResponseReceivedListener(
          (response) => {
            const data = response.notification.request.content.data;
            if (data?.route) {
              try { router.push(data.route as any); } catch {}
            }
          }
        );
        // Listen for foreground notifications
        notificationReceivedListener.current = Notifications.addNotificationReceivedListener(() => {});
      }).catch(() => {});
    }

    return () => {
      mounted = false;
      if (Platform.OS !== 'web') {
        import('expo-notifications').then((Notifications) => {
          if (notificationResponseListener.current) {
            Notifications.removeNotificationSubscription(notificationResponseListener.current);
          }
          if (notificationReceivedListener.current) {
            Notifications.removeNotificationSubscription(notificationReceivedListener.current);
          }
        }).catch(() => {});
      }
    };
  }, [router]);

  const toggleNotifications = useCallback(async () => {
    const newState = !enabled;
    setEnabled(newState);
    await setNotificationsEnabled(newState);

    if (newState) {
      const granted = await requestNotificationPermissions();
      setPermissionGranted(granted);
      if (granted) {
        await scheduleDailyReminders();
      }
    }

    const count = await getScheduledCount();
    setScheduledCount(count);
  }, [enabled]);

  return {
    enabled,
    permissionGranted,
    scheduledCount,
    toggleNotifications,
  };
}
