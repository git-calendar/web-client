<script setup lang="ts">
import XDaysView from '@/components/timeline/XDaysView.vue';
import SideBar from '@/components/SideBar.vue';
import MonthSideMap from '@/components/MonthSideMap.vue';
import TopBar from '@/components/TopBar.vue';
import CalendarList from '@/components/CalendarList.vue';
import EventModal from '@/components/modals/EventModal.vue';
import CalendarModal from '@/components/modals/CalendarModal.vue';

import { computed, type ComputedRef } from 'vue';
import { useRoute } from 'vue-router';
import { useKeyboard } from '@/composables/useKeyboard';
import { useCalendarModal } from '@/composables/modals/useCalendarModal';
import { useEventModal } from '@/composables/modals/useEventModal';
import { useSidebar } from '@/composables/useSidebar';
import type { CalendarView } from '@/services/settings';
import TagModal from '@/components/modals/TagModal.vue';
import { useTagModal } from '@/composables/modals/useTagModal';

useKeyboard();
const calendarModal = useCalendarModal();
const eventModal = useEventModal();
const tagModal = useTagModal();
const route = useRoute();
const sidebar = useSidebar();

const activeView: ComputedRef<CalendarView> = computed(() => String(route.params.view) as CalendarView);

const views = {
  '4d': [XDaysView, 4],
  w: [XDaysView, 7],
  m: [null, null],
};
</script>

<template>
  <main id="calendar-view">
    <div v-if="sidebar.isOpen.value" class="sidebar-backdrop" aria-hidden="true" @click="sidebar.close"></div>

    <SideBar :hidden="!sidebar.isOpen.value">
      <MonthSideMap />
      <CalendarList ref="calendars-list" />
    </SideBar>

    <TopBar />
    <component :is="views[activeView][0]" :num-of-days="views[activeView][1]" ref="calendar-view" />

    <EventModal v-if="eventModal.isOpen.value" />
    <TagModal v-if="tagModal.isOpen.value" />
    <CalendarModal v-if="calendarModal.isOpen.value" />
  </main>
</template>

<style scoped>
.sidebar-backdrop {
  display: none;
}

#calendar-view:has(aside[hidden]) {
  grid-template-columns: auto;
  grid-template-areas:
    'topbar'
    'content';
}

aside[hidden] {
  position: absolute;
  height: 100%;
  left: calc(-1 * var(--sidebar-width));
  width: var(--sidebar-width);
}

#calendar-view {
  display: grid;
  grid-template-columns: var(--sidebar-width) auto;
  grid-template-rows: var(--topbar-height) auto;
  grid-template-areas:
    'sidebar topbar'
    'sidebar content';

  height: 100%;
}

component {
  background-color: red;
}

@media (max-width: 768px) {
  .sidebar-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 599;
    backdrop-filter: blur(5px);
    background-color: rgba(0, 0, 0, 0.3);
  }

  aside {
    position: absolute;
    height: 100%;
    width: var(--sidebar-width);
    z-index: 600;
  }

  #calendar-view {
    grid-template-columns: auto;
    grid-template-areas:
      'topbar'
      'content';
  }
}
</style>
