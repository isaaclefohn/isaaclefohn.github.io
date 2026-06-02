/**
 * Local push notification service for daily rewards and streak reminders.
 * Uses expo-notifications for scheduling.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/** Request notification permissions (iOS requires explicit permission) */
export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === 'granted';
}

/** Schedule a daily reward reminder ~22 hours from now */
export async function scheduleDailyRewardReminder(): Promise<void> {
  // Cancel any existing daily reward notifications first
  await cancelDailyRewardReminder();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Your daily reward is ready!',
      body: 'Come back and claim your coins and gems 💎',
      sound: true,
      badge: 1,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 22 * 60 * 60, // 22 hours
      repeats: false,
    },
  });
}

/** Schedule a streak reminder for players with active streaks */
export async function scheduleStreakReminder(streakDays: number): Promise<void> {
  await cancelStreakReminder();

  if (streakDays < 2) return; // Only remind if streak is worth protecting

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `Don't lose your ${streakDays}-day streak!`,
      body: 'Play a quick game to keep it going 🔥',
      sound: true,
      badge: 1,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 20 * 60 * 60, // 20 hours (earlier than daily reward)
      repeats: false,
    },
  });
}

/** Cancel pending daily reward notification */
export async function cancelDailyRewardReminder(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const notif of scheduled) {
    // Match case-insensitively. The retention scheduler enqueues a
    // 24h reminder titled "Daily reward waiting!" (capital D); the
    // daily-reward scheduler enqueues "Your daily reward is ready!"
    // (also capital D in "Daily" — wait, no, lower-d in "daily").
    // Either way, the previous `.includes('daily reward')` only matched
    // the lowercase-d variant, so the retention 24h reminder survived
    // and the player got TWO near-duplicate notifications two hours
    // apart after claiming. Normalize to lowercase + also accept the
    // explicit data-tag if the call site set one.
    const title = notif.content.title ?? '';
    const dataType = (notif.content.data as { type?: string } | undefined)?.type;
    if (title.toLowerCase().includes('daily reward') || dataType === 'daily_reward') {
      await Notifications.cancelScheduledNotificationAsync(notif.identifier);
    }
  }
}

/** Cancel pending streak notification */
export async function cancelStreakReminder(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const notif of scheduled) {
    if (notif.content.title?.includes('streak')) {
      await Notifications.cancelScheduledNotificationAsync(notif.identifier);
    }
  }
}

/**
 * Schedule retention notifications at optimal intervals (2hr, 24hr, 72hr).
 * Top puzzle games use these exact intervals for re-engagement.
 * Called once on first launch; they don't repeat.
 */
export async function scheduleRetentionNotifications(): Promise<void> {
  // Cancel any existing retention notifications first
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const notif of scheduled) {
    if (notif.content.data?.type === 'retention') {
      await Notifications.cancelScheduledNotificationAsync(notif.identifier);
    }
  }

  // 2-hour "come back" nudge
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Your pieces are waiting!',
      body: 'Jump back in for a quick game.',
      sound: true,
      data: { type: 'retention' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 2 * 60 * 60,
      repeats: false,
    },
  });

  // 24-hour daily reward reminder
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Daily reward waiting!',
      body: 'Claim your free coins and spin the wheel.',
      sound: true,
      badge: 1,
      data: { type: 'retention' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 24 * 60 * 60,
      repeats: false,
    },
  });

  // 72-hour win-back
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'We miss you!',
      body: 'Come back for a bonus reward — your streak is at risk!',
      sound: true,
      badge: 1,
      data: { type: 'retention' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 72 * 60 * 60,
      repeats: false,
    },
  });
}

/** Clear badge count */
export async function clearBadge(): Promise<void> {
  if (Platform.OS === 'ios') {
    await Notifications.setBadgeCountAsync(0);
  }
}

/**
 * Cancel every scheduled notification — used when the player turns off
 * the Push Notifications toggle in Settings. Previously the toggle only
 * flipped a boolean, and any daily-reward / streak / retention reminders
 * already queued continued firing on schedule. Calling this in the setter
 * forces the player's intent to actually take effect.
 */
export async function cancelAllNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (e) {
    // Notifications not available on this platform / not granted —
    // silently fail; nothing scheduled means nothing to cancel.
  }
}
