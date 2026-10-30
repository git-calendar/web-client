<script setup lang="ts">
import { computed } from 'vue';
import { DateTime } from 'luxon';
import { getCalendarRedirect, moveView } from '@/utils';

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
const useShortLabels = computed(() => width.value < 365);

const view = computed<CalendarView>({
  get: () => String(router.currentRoute.value.params.view) as CalendarView,
  set: (view) => {
    router.push({
      name: 'calendar',
      params: { ...router.currentRoute.value.params, view },
    });
  },
});

function jumpToToday() {
  router.push(getCalendarRedirect(view.value, DateTime.now()));
}
</script>

<template>
  <header>
    <div id="corner-btns" :class="{ 'over-sidebar': sidebar.isOpen.value }">
      <SidebarCloseBtn />
      <NewEventBtn />
    </div>

    <SyncStatus />
    <MultiToggle
      v-model="view"
      :options="CALENDAR_VIEWS"
      :labels="CALENDAR_VIEWS.map((view) => $t(`views.${view}.${useShortLabels ? 'short' : 'long'}`))"
      name="view-selector"
      class="view-toggle"
    />

    <button
      id="today-btn"
      :title="$t('actions.jumpToToday')"
      :aria-label="$t('actions.jumpToToday')"
      @click="jumpToToday"
    >
      {{ $t(`todayBtn.${useShortLabels ? 'short' : 'long'}`) }}
    </button>

    <div v-if="!isMobile" id="view-nav-btns">
      <button
        :title="$t('actions.previousPeriod')"
        :aria-label="$t('actions.previousPeriod')"
        @click="moveView(true, router)"
      >
        <FiChevronLeft />
      </button>
      <button :title="$t('actions.nextPeriod')" :aria-label="$t('actions.nextPeriod')" @click="moveView(false, router)">
        <FiChevronRight />
      </button>
    </div>
  </header>
</template>

<style scoped>
header {
  /* space reserved for the corner buttons: toggle + gap + new event btn */
  --corner-width: calc(2.4rem + 0.5rem + 9rem);

  position: relative;
  display: flex;
  align-items: center;
  justify-content: end;
  gap: 0.5rem;

  padding: 0.5rem;
  padding-left: calc(1rem + var(--corner-width));
  /* span the sidebar column too, so the corner buttons stay put while the sidebar slides */
  grid-row: 1;
  grid-column: 1 / -1;
}

@media (max-width: 519.98px) {
  header {
    --corner-width: calc(2.4rem + 0.5rem + 2.4rem); /* icon only */
  }
}

/* floats above the sidebar's top area, so it never pushes the rest of the header; stretches to the sidebar width when it's open */
#corner-btns {
  position: absolute;
  top: 0.5rem;
  left: 0.5rem;
  z-index: 601; /* above the mobile sidebar and backdrop */
  display: flex;
  gap: 0.5rem;
  width: var(--corner-width);
  transition: width 0.12s ease-out;

  > button {
    flex-shrink: 0;
    transition: background-color 0.12s ease-out;
  }

  > .new-event-btn {
    flex: 1 1 0;
  }

  &.over-sidebar {
    width: calc(var(--sidebar-width) - 1rem);

    > button {
      background-color: var(--sidebar-btn-bg-color);

      &:hover:not(:focus-visible):not(:disabled) {
        background-color: var(--sidebar-btn-bg-hover-color);
      }
    }
  }
}

.view-toggle,
#today-btn {
  flex-shrink: 0;
  white-space: nowrap;
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
