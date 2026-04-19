<script setup lang="ts">
import { ref, watch } from 'vue';
import { getCurrentViewDatetime, getWeekAlignedRedirect, moveView } from '@/utils';
import { DateTime } from 'luxon';
import { FiChevronLeft, FiChevronRight } from 'vue-icons-plus/fi';
import { useRouter } from 'vue-router';
import { useSidebar } from '@/composables/useSidebar';
import MultiToggle from '@/components/MultiToggle.vue';
import SidebarCloseBtn from '@/components/SidebarCloseBtn.vue';
import NewEventBtn from '@/components/NewEventBtn.vue';
import { useMobile } from '@/composables/useMobile';

const router = useRouter();
const sidebar = useSidebar();

const isMobile = useMobile();

const views = ['4days', 'Week', 'Month'];
const view = ref(capitalized(router.currentRoute.value.params.view.toString()));

function changeView(viewName: string) {
  view.value = viewName;
  if (view.value === 'Week') {
    // week view should be aligned
    let current = getCurrentViewDatetime(router.currentRoute.value.params);
    router.push(getWeekAlignedRedirect(current));
  } else {
    router.push({ name: 'calendar', params: { view: view.value.toLowerCase() } });
  }
}
watch(view, changeView);

function jumpToToday() {
  const today = DateTime.now();
  const params = router.currentRoute.value.params;

  if (params.view === 'week') {
    // special case for week
    router.push(getWeekAlignedRedirect(today));
    return;
  }
  router.push({ name: 'calendar', params: { year: today.year, month: today.month, day: today.day } });
}

function capitalized(str: string): string {
  let result: string;
  result = str.charAt(0).toUpperCase();
  result += str.slice(1) || '';
  return result;
}
</script>

<template>
  <header>
    <SidebarCloseBtn v-if="!sidebar.isOpen.value" />
    <NewEventBtn v-if="!sidebar.isOpen.value" :large="!isMobile" />

    <!-- TODO: remove disabled -->
    <MultiToggle v-model="view" :options="views" :disabled="['Month']" name="view-selector" />

    <button id="today-btn" @click="jumpToToday">
      {{ $t('todayBtn') }}
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
