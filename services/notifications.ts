// MasarAI Push Notifications Service
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIFICATION_ENABLED_KEY = '@masarai_notifications_enabled';
const DAILY_REMINDER_ID = 'daily-plan-reminder';
const EVENING_REMINDER_ID = 'evening-training-reminder';
const STREAK_REMINDER_ID = 'streak-reminder';

// Configure how notifications appear when app is in foreground
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch {
  // Silently fail on web/unsupported platforms
}

export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;

    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch (err) {
    console.error('Notification permission error:', err);
    return false;
  }
}

export async function isNotificationsEnabled(): Promise<boolean> {
  try {
    const stored = await AsyncStorage.getItem(NOTIFICATION_ENABLED_KEY);
    return stored !== 'false'; // default to true
  } catch {
    return true;
  }
}

export async function setNotificationsEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(NOTIFICATION_ENABLED_KEY, enabled ? 'true' : 'false');
  if (enabled) {
    await scheduleDailyReminders();
  } else {
    await cancelAllReminders();
  }
}

export async function scheduleDailyReminders(): Promise<void> {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return;

    const enabled = await isNotificationsEnabled();
    if (!enabled) return;

    // Cancel existing scheduled notifications first
    await cancelAllReminders();

    // Morning reminder - 8:00 AM daily
    await Notifications.scheduleNotificationAsync({
      identifier: DAILY_REMINDER_ID,
      content: {
        title: 'صباح الخير! خطتك اليومية جاهزة 📚',
        body: 'ابدأ يومك الدراسي مع مسار AI وحقق أهدافك',
        sound: 'default',
        data: { type: 'daily_plan', route: '/(tabs)/plan' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 8,
        minute: 0,
      },
    });

    // Evening training reminder - 6:00 PM daily
    await Notifications.scheduleNotificationAsync({
      identifier: EVENING_REMINDER_ID,
      content: {
        title: 'وقت التدريب المسائي 🎯',
        body: 'لا تنس إكمال تدريباتك اليومية. 15 دقيقة تكفي!',
        sound: 'default',
        data: { type: 'training', route: '/(tabs)/practice' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 18,
        minute: 0,
      },
    });

    // Streak reminder - 9:00 PM daily
    await Notifications.scheduleNotificationAsync({
      identifier: STREAK_REMINDER_ID,
      content: {
        title: 'حافظ على سلسلتك! 🔥',
        body: 'لم تكمل خطتك اليوم بعد. لا تفقد سلسلة أيامك المتتالية!',
        sound: 'default',
        data: { type: 'streak', route: '/(tabs)/plan' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 21,
        minute: 0,
      },
    });

    console.log('Daily reminders scheduled successfully');
  } catch (err) {
    console.error('Failed to schedule reminders:', err);
  }
}

export async function cancelAllReminders(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (err) {
    console.error('Failed to cancel reminders:', err);
  }
}

export async function sendImmediateNotification(
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<void> {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
        data: data || {},
      },
      trigger: null, // immediate
    });
  } catch (err) {
    console.error('Failed to send notification:', err);
  }
}

// Send task completion celebration notification
export async function sendTaskCompletionNotification(taskTitle: string, score: number): Promise<void> {
  const emoji = score >= 90 ? '🏆' : score >= 70 ? '⭐' : '✅';
  await sendImmediateNotification(
    `${emoji} أحسنت! أكملت "${taskTitle}"`,
    `حصلت على ${score}% - استمر في التقدم!`,
    { type: 'task_complete' }
  );
}

// Send streak milestone notification
export async function sendStreakNotification(streakDays: number): Promise<void> {
  if (streakDays % 7 === 0) {
    await sendImmediateNotification(
      `🔥 سلسلة ${streakDays} يوم متتالي!`,
      'أداء رائع! استمر في المثابرة وستحقق أهدافك',
      { type: 'streak_milestone' }
    );
  }
}

// Get scheduled notifications count (for settings display)
export async function getScheduledCount(): Promise<number> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    return scheduled.length;
  } catch {
    return 0;
  }
}
