<script setup lang="ts">
import LoadingView from '@/views/LoadingView.vue';
import { CalendarCore, CoreLoadingState } from '@/wasm/core-wrapper';
import { onBeforeMount, ref } from 'vue';
import AlertModal from '@/components/modals/AlertModal.vue';
import { createCalendarOnce } from '@/utils';
import { syncAllWrapper } from '@/services/gitSync';
import { settings } from '@/services/settings';
import { useAlertModal } from '@/composables/modals/useAlertModal';
import { notifyEventsChanged } from '@/composables/useEventsRefresh';
import { loadCalendars } from '@/services/calendarCache';

const { alert } = useAlertModal();

const coreReady = ref(false); // waits for loadCalendars etc.

async function sync() {
  await syncAllWrapper(); // pull/sync/fetch all that
  await CalendarCore.loadCalendars(); // update events

  notifyEventsChanged();
}

onBeforeMount(async () => {
  try {
    if (settings.value.corsProxyURL !== '') {
      await CalendarCore.setCorsProxy(settings.value.corsProxyURL);
    }
    await createCalendarOnce();
    await CalendarCore.loadCalendars(); // load local first, they might change after with network pull
    sync();

    await loadCalendars();

    coreReady.value = true;
  } catch (err) {
    alert(String(err));
  }
});
</script>

<template>
  <AlertModal />
  <LoadingView v-if="CoreLoadingState.percentage < 100 || !coreReady" />
  <RouterView v-else />
</template>

<style scoped>
main {
  height: 100%;
}
</style>
