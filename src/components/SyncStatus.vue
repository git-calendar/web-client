<script setup lang="ts">
import { computed } from 'vue';
import { useOnlineStatus } from '@/composables/useOnlineStatus';
import { gitSyncStatus } from '@/services/gitSync';

const { isOnline } = useOnlineStatus();

const displayStatus = computed(() => {
  if (!isOnline.value) return 'offline';

  return gitSyncStatus.value;
});

const statusLabel = computed(() => {
  if (!isOnline.value) return 'Offline';

  switch (gitSyncStatus.value) {
    case 'idle':
      return 'Git sync idle';
    case 'syncing':
      return 'Syncing git remotes';
    default:
      return 'Wierd state';
  }
});
</script>

<template>
  <div class="git-sync-box" :title="statusLabel" :aria-label="statusLabel">
    <span class="git-sync-dot" :class="`status-${displayStatus}`" role="status" />
  </div>
</template>

<style scoped>
.git-sync-box {
  height: 100%;
  aspect-ratio: 1 / 1;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: help;
}

.git-sync-dot {
  display: inline-block;
  width: 0.6rem;
  height: 0.6rem;
  border-radius: 50%;
  box-shadow: 0 0 0 3px var(--glow);
  background: var(--dot);
}

.status-offline {
  --dot: #ef4444;
  --glow: rgb(239 68 68 / 0.18);
}

.status-idle {
  --dot: #22c55e;
  --glow: rgb(34 197 94 / 0.18);
}

.status-syncing {
  --dot: #f97316;
  --glow: rgb(249 115 22 / 0.2);
  animation: dot-breathe 1s ease-in-out infinite;
}

@keyframes dot-breathe {
  50% {
    transform: scale(1.25);
  }
}
</style>
