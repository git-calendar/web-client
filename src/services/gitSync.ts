import { CalendarCore } from '@/wasm/core-wrapper';
import { promiseTimeout } from '@vueuse/core';
import { ref, readonly } from 'vue';
import { useAlertModal } from '@/composables/modals/useAlertModal';
import { formatErrorForUser, logError } from '@/services/errorHandling';
import { waitForOnline } from '@/composables/useOnlineStatus';
import { coreErrorCodeOf } from '@/types/errors';
import { refreshCalendars } from '@/services/calendarCache';
import { notifyEventsChanged } from '@/composables/useEventsRefresh';

type GitSyncStatus = 'idle' | 'syncing';

const FIRST_RATE_LIMIT_RETRY_MS = 10_000;
const RATE_LIMIT_RETRY_MS = 30_000;

const { alert } = useAlertModal();
const statusRef = ref<GitSyncStatus>('idle');
const hasQueuedSyncRef = ref(false);
const errorRef = ref<string | null>(null);

let currentSync: Promise<void> | null = null;

export const gitSyncStatus = readonly(statusRef);
export const hasQueuedGitSync = readonly(hasQueuedSyncRef);
// shown as a notification; a failed background sync should not block the UI with a dialog
export const gitSyncError = readonly(errorRef);

export function dismissGitSyncError(): void {
  errorRef.value = null;
}

export function syncAllWrapper(): Promise<void> {
  if (currentSync) {
    hasQueuedSyncRef.value = true;
    return currentSync;
  }

  currentSync = runSyncQueue();
  return currentSync;
}

async function runSyncQueue(): Promise<void> {
  statusRef.value = 'syncing';

  try {
    do {
      hasQueuedSyncRef.value = false;
      await syncWithRateLimitRetry();
    } while (hasQueuedSyncRef.value);
    errorRef.value = null;
  } catch (err) {
    logError(err);
    errorRef.value = formatErrorForUser(err);
  } finally {
    try {
      await refreshCalendars();
      notifyEventsChanged();
    } catch (err) {
      logError(err);
      alert(err);
    }

    statusRef.value = 'idle';
    hasQueuedSyncRef.value = false;
    currentSync = null;
  }
}

async function syncWithRateLimitRetry(): Promise<void> {
  let retryDelay = FIRST_RATE_LIMIT_RETRY_MS;

  while (true) {
    await waitForOnline();

    try {
      await CalendarCore.syncAll();
      return;
    } catch (err) {
      if (coreErrorCodeOf(err) !== 'RATELIMIT') throw err;

      logError(err);
      await promiseTimeout(retryDelay);
      retryDelay = RATE_LIMIT_RETRY_MS;
    }
  }
}
