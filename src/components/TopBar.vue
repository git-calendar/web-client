<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { getCurrentViewDatetime, getWeekAlignedRedirect, moveView } from '@/utils';

import { FiChevronLeft, FiChevronRight } from 'vue-icons-plus/fi';
import { useRouter } from 'vue-router';
import { useSidebar } from '@/composables/useSidebar';
import MultiToggle from '@/components/MultiToggle.vue';
import SidebarCloseBtn from '@/components/SidebarCloseBtn.vue';
import NewEventBtn from '@/components/NewEventBtn.vue';
import SyncStatus from '@/components/SyncStatus.vue';
import { useWindowSize } from '@vueuse/core';
import { CALENDAR_VIEWS } from '@/constants';
import type { CalendarView } from '@/services/settings';

const router = useRouter();
const sidebar = useSidebar();

const { width } = useWindowSize(); // reactive window size
const isMobile = computed(() => width.value < 500);

const view = ref<CalendarView>('4d');
watch(
  () => router.currentRoute.value.params.view,
  (newView) => {
    view.value = String(newView) as CalendarView;
  },
  { immediate: true },
);
watch(view, (newView) => {
  if (newView === 'w') {
    // week view should be aligned
    let current = getCurrentViewDatetime(router.currentRoute.value.params);
    router.push(getWeekAlignedRedirect(current));
  } else {
    router.push({
      name: 'calendar',
      params: { ...router.currentRoute.value.params, view: newView },
    });
  }
});

function jumpToToday() {
  router.push({ name: 'calendar', params: { view: view.value } });
}
</script>

<template>
  <header>
    <SidebarCloseBtn v-if="!sidebar.isOpen.value" />
    <NewEventBtn v-if="!sidebar.isOpen.value" :large="!isMobile" />

    <SyncStatus />
    <!-- TODO: remove disabled -->
    <MultiToggle
      v-model="view"
      :options="CALENDAR_VIEWS"
      :labels="CALENDAR_VIEWS.map((view) => $t(`views.${view}.${isMobile ? 'short' : 'long'}`))"
      :disabled="['m']"
      name="view-selector"
    />

    <button id="today-btn" @click="jumpToToday">
      {{ $t(`todayBtn.${isMobile ? 'short' : 'long'}`) }}
    </button>

    <div id="view-nav-btns">
      <button @click="moveView(true, router)"><FiChevronLeft /></button>
      <button @click="moveView(false, router)"><FiChevronRight /></button>
    </div>
  </header>
</template>

<style scoped>
header {
  display: flex;
  align-items: center;
  justify-content: end;
  gap: 0.5rem;

  padding: 0.5rem;
  grid-area: topbar;
}

.new-event-btn {
  margin-right: auto;
}

#view-nav-btns {
  display: flex;

  button {
    width: 1.8rem;
    height: 1.8rem;

    padding: 7%;
    border-radius: var(--small-border-radius);
    border: none;
    background: transparent;
    cursor: pointer;
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
