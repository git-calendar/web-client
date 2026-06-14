import { ref, readonly, onMounted, onUnmounted } from 'vue';

const isOnline = ref(typeof navigator === 'undefined' ? true : navigator.onLine);

export function useOnlineStatus() {
  function updateOnline() {
    isOnline.value = true;
  }

  function updateOffline() {
    isOnline.value = false;
  }

  onMounted(() => {
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOffline);
  });

  onUnmounted(() => {
    window.removeEventListener('online', updateOnline);
    window.removeEventListener('offline', updateOffline);
  });

  return {
    isOnline: readonly(isOnline),
  };
}
