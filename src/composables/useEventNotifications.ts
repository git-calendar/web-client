import { onScopeDispose, ref, watch, type Ref } from 'vue';
import { DateTime } from 'luxon';
import { CalendarCore } from '@/wasm/core-wrapper';
import { settings } from '@/services/settings';
import { logError } from '@/services/errorHandling';

export const notificationPermission = ref<NotificationPermission | 'unsupported'>(
  typeof Notification === 'undefined' || !window.isSecureContext ? 'unsupported' : Notification.permission,
);

export async function requestNotificationPermission() {
  if (notificationPermission.value === 'unsupported') return;
  try {
    notificationPermission.value = await Notification.requestPermission();
  } catch (error) {
    logError(error);
    notificationPermission.value = 'unsupported';
  }
}

// Poll fresh core data, so edits, deletions and sync need no timer bookkeeping.
export function useEventNotifications(ready: Ref<boolean>) {
  void requestNotificationPermission();
  let lastChecked = Date.now();
  let busy = false;
  let stopped = false;

  async function poll() {
    if (stopped || !ready.value || busy) return;
    const now = Date.now();
    if (notificationPermission.value !== 'unsupported') {
      notificationPermission.value = Notification.permission;
    }
    if (notificationPermission.value !== 'granted') {
      lastChecked = now;
      return;
    }

    busy = true;
    try {
      // After sleep or throttling, only catch up the last minute, not hours of reminders.
      const from = DateTime.fromMillis(Math.max(lastChecked, now - 60_000));
      const notifications = await CalendarCore.getNotifications(from, DateTime.fromMillis(now), null);
      if (stopped || Notification.permission !== 'granted') return;
      lastChecked = now;
      for (const { event, at } of notifications) {
        const time = event.from.toLocaleString({
          hour: 'numeric',
          minute: '2-digit',
          hourCycle: settings.value.timeFormat,
        });
        const notification = new Notification(event.title, {
          icon: '/favicon-96x96.png',
          body: [time, event.calendar, event.location].filter(Boolean).join(' · '),
          tag: `${event.id}:${at.toMillis()}`,
        });
        notification.onclick = () => {
          window.focus();
          notification.close();
        };
      }
    } catch (error) {
      logError(error);
    } finally {
      busy = false;
    }
  }

  watch(ready, () => {
    lastChecked = Date.now();
  });
  const interval = window.setInterval(() => void poll(), 15_000);
  window.addEventListener('focus', poll);
  onScopeDispose(() => {
    stopped = true;
    window.clearInterval(interval);
    window.removeEventListener('focus', poll);
  });
}
