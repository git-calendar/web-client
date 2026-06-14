import { CalendarCore } from '@/wasm/core-wrapper';
import { ref, readonly } from 'vue';
import { useAlertModal } from '@/composables/modals/useAlertModal';

type GitSyncStatus = 'idle' | 'syncing';

const { alert } = useAlertModal();

const statusRef = ref<GitSyncStatus>('idle');
const hasQueuedSyncRef = ref(false);

let currentSync: Promise<void> | null = null;

export const gitSyncStatus = readonly(statusRef);
export const hasQueuedGitSync = readonly(hasQueuedSyncRef);

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

      await CalendarCore.syncAll();
    } while (hasQueuedSyncRef.value);
  } catch (err) {
    alert(String(err)); // show alert modal
  } finally {
    statusRef.value = 'idle';
    hasQueuedSyncRef.value = false;
    currentSync = null;
  }
}
