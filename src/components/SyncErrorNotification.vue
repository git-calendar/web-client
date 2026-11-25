<script setup lang="ts">
import { watch } from 'vue';
import { dismissGitSyncError, gitSyncError } from '@/services/gitSync';
import { TbX } from 'vue-icons-plus/tb';

const AUTO_DISMISS_MS = 8_000;

let timer: ReturnType<typeof setTimeout> | undefined;

watch(gitSyncError, (message) => {
  clearTimeout(timer);
  if (message) timer = setTimeout(dismissGitSyncError, AUTO_DISMISS_MS);
});
</script>

<template>
  <div v-if="gitSyncError" id="sync-error-notification" role="status">
    <p>{{ $t('message.syncFailed') }}: {{ gitSyncError }}</p>
    <button type="button" :title="$t('message.close')" :aria-label="$t('message.close')" @click="dismissGitSyncError">
      <TbX />
    </button>
  </div>
</template>

<style scoped>
/* same box as the alert modal's form, just without the backdrop */
#sync-error-notification {
  position: fixed;
  right: 1rem;
  bottom: 1rem;
  z-index: 1000;
  width: calc(100% - 2rem);
  max-width: 30rem;
  overflow-wrap: break-word;
  word-break: break-word;

  padding: 1rem 3.25rem 1rem 1rem;

  border-radius: var(--small-border-radius);
  border: 1px solid var(--btn-bg-color-hover);
  background-color: var(--bg-color);

  > p {
    margin: 0;
  }

  /* same as the prev/next buttons in the top bar */
  > button {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
    width: 1.8rem;
    height: 1.8rem;
    padding: 0.25rem; /* the top bar's 7% of its tiny button row; % would be huge here */
    border: none;
    background: transparent;
    color: var(--text-color);

    display: flex;
    align-items: center;
    justify-content: center;

    &:hover {
      background-color: var(--sidebar-hover-color);
    }
  }
}
</style>
