import { ref, readonly } from 'vue';

const isOnline = ref(typeof navigator === 'undefined' ? true : navigator.onLine);

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    isOnline.value = true;
  });

  window.addEventListener('offline', () => {
    isOnline.value = false;
  });
}

export function useOnlineStatus() {
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
