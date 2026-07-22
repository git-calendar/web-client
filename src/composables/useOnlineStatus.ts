import { ref, readonly } from 'vue';

const isOnline = ref(true);

function updateOnlineStatus() {
  if (typeof navigator !== 'undefined') {
    isOnline.value = navigator.onLine;
  }
}

if (typeof window !== 'undefined') {
  updateOnlineStatus();
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  window.addEventListener('pageshow', updateOnlineStatus);
}

export function useOnlineStatus() {
  updateOnlineStatus();

  return {
    isOnline: readonly(isOnline),
  };
}

export function waitForOnline(): Promise<void> {
  if (typeof navigator === 'undefined' || navigator.onLine) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    window.addEventListener('online', () => resolve(), { once: true });
  });
}
