<script setup lang="ts">
import { useTranslation } from '@/composables/useTranslation';
import router from '@/router';
import { getCurrentViewDatetime, getCurrentViewStartDatetime, getStartOfWeek, getViewLengthInDays } from '@/utils';
import { DateTime } from 'luxon';
import { computed, ref, watch } from 'vue';
import { FiChevronDown, FiChevronUp } from 'vue-icons-plus/fi';
import { useRoute } from 'vue-router';

const { monthNameLong } = useTranslation();
const route = useRoute();

const selectedDate = computed(() => getCurrentViewDatetime(route.params));
const isMonthView = computed(() => route.params.view === 'm');
const monthTracker = ref(selectedDate.value.month);
const yearTracker = ref(selectedDate.value.year);

const viewInterval = computed(() => {
  const start = getCurrentViewStartDatetime(route.params);
  const length = getViewLengthInDays(route.params);

  return {
    start,
    end: start.plus({ days: length - 1 }),
  };
});

const days = computed(() => {
  const firstOfTheMonth = DateTime.fromObject({
    year: yearTracker.value,
    month: monthTracker.value,
    day: 1,
  });

  const gridStart = getStartOfWeek(firstOfTheMonth);
  return Array.from({ length: 42 }, (_, index) => gridStart.plus({ days: index }));
});

watch(
  () => route.params,
  () => {
    if (isMonthView.value) {
      monthTracker.value = selectedDate.value.month;
      yearTracker.value = selectedDate.value.year;
      return;
    }

    const viewStart = getCurrentViewStartDatetime(route.params);
    const viewEnd = viewStart.plus({
      days: getViewLengthInDays(route.params),
    });

    const trackedMonthStart = viewStart
      .set({
        year: yearTracker.value,
        month: monthTracker.value,
        day: 1,
      })
      .startOf('day');

    const trackedMonthEnd = trackedMonthStart.plus({ months: 1 });

    const isWholeIntervalAfterCurrentMonth = viewStart >= trackedMonthEnd;
    const isWholeIntervalBeforeCurrentMonth = viewEnd <= trackedMonthStart;

    if (isWholeIntervalAfterCurrentMonth || isWholeIntervalBeforeCurrentMonth) {
      monthTracker.value = viewStart.month;
      yearTracker.value = viewStart.year;
    }
  },
  { immediate: true },
);

function changeMonthNum(up: boolean) {
  if (up) monthTracker.value++;
  else monthTracker.value--;

  // handle year jumps
  if (monthTracker.value >= 13) {
    monthTracker.value = 1;
    yearTracker.value++;
  } else if (monthTracker.value <= 0) {
    monthTracker.value = 12;
    yearTracker.value--;
  }
}

function jumpToInterval(clickedDay: DateTime) {
  router.replace({
    name: 'calendar',
    params: {
      ...route.params,
      year: clickedDay.year,
      month: clickedDay.month,
      day: clickedDay.day,
    },
  });
}

const hoveredDay = ref<DateTime | null>(null);
const pressedDay = ref<DateTime | null>(null);

function getIntervalFromDay(day: DateTime) {
  if (route.params.view === 'w') {
    const start = getStartOfWeek(day);

    return {
      start,
      end: start.plus({ days: 6 }),
    };
  }

  const length = getViewLengthInDays(route.params);

  return {
    start: day,
    end: day.plus({ days: length - 1 }),
  };
}

const hoverInterval = computed(() => {
  if (!hoveredDay.value) return null;

  if (isMonthView.value) {
    return { start: hoveredDay.value, end: hoveredDay.value };
  }

  return getIntervalFromDay(hoveredDay.value);
});

const pressedInterval = computed(() => {
  if (isMonthView.value || !pressedDay.value) return null;

  return getIntervalFromDay(pressedDay.value);
});
</script>

<template>
  <div id="month-side-map">
    <div class="container">
      <span id="month-name">
        {{ `${monthNameLong(DateTime.now().set({ month: monthTracker }))} ${yearTracker}` }}
      </span>
      <span id="month-nav">
        <button
          :title="$t('actions.previousMonth')"
          :aria-label="$t('actions.previousMonth')"
          @click="changeMonthNum(false)"
        >
          <FiChevronUp />
        </button>
        <button :title="$t('actions.nextMonth')" :aria-label="$t('actions.nextMonth')" @click="changeMonthNum(true)">
          <FiChevronDown />
        </button>
      </span>
    </div>

    <div id="day-grid">
      <div v-for="i in 7" class="day-name">
        {{ days[i - 1]?.weekdayShort?.slice(0, 2) }}
      </div>

      <div
        v-for="d in days"
        :key="d.toISODate()!"
        class="day"
        :class="{
          today: d.hasSame(DateTime.now(), 'day'),
          'selected-day': isMonthView && d.hasSame(selectedDate, 'day'),
          'not-this-month': d.month !== monthTracker,
          'in-range': !isMonthView && d >= viewInterval.start && d <= viewInterval.end,
          'range-start': !isMonthView && d.hasSame(viewInterval.start, 'day'),
          'range-end': !isMonthView && d.hasSame(viewInterval.end, 'day'),
          'pressed-range': pressedInterval && d >= pressedInterval.start && d <= pressedInterval.end,
        }"
        @click="jumpToInterval(d)"
        @mouseenter="hoveredDay = d"
        @mouseleave="hoveredDay = null"
        @pointerdown="pressedDay = d"
        @pointerup="pressedDay = null"
        @pointercancel="pressedDay = null"
        @pointerleave="pressedDay = null"
      >
        <div
          v-if="hoverInterval && d >= hoverInterval.start && d <= hoverInterval.end"
          class="hover-layer"
          :class="{
            'hover-range-start': hoverInterval && d.hasSame(hoverInterval.start, 'day'),
            'hover-range-end': hoverInterval && d.hasSame(hoverInterval.end, 'day'),
          }"
        />
        {{ d.day }}
      </div>
    </div>
  </div>
</template>

<style scoped>
#month-side-map {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  .container {
    padding-left: 0.4rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-weight: bold;
  }
}

#month-nav {
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

#day-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  user-select: none;

  .day-name {
    text-align: center;
    font-size: 0.8rem;
    text-transform: uppercase;
    opacity: 0.5;
    padding-bottom: 0.5rem;
  }
}

.day {
  aspect-ratio: 1 / 1;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  cursor: pointer;
  position: relative;

  &.today {
    font-weight: 900;
    position: relative;
    /*text-decoration: underline;
    text-decoration-thickness: 0.15rem;
    text-underline-offset: 0.2rem;*/

    &:not(.in-range):not(.selected-day) {
      color: var(--git-color);
    }

    /* the line */
    &::after {
      content: '';
      position: absolute;
      left: 0;
      top: 1.5rem;
      height: 0.15rem;
      width: calc(100% - 2 * 0.4rem);
      margin: 0 0.4rem;
      background-color: currentColor; /* same as color of parent */
      border-radius: 100rem;
    }
  }

  &.not-this-month {
    color: color-mix(in srgb, var(--text-color) 30%, transparent);

    &.in-range {
      color: color-mix(in srgb, var(--text-color) 50%, transparent);
    }
  }

  &.in-range {
    background-color: var(--git-bg-color);
    width: 101%;
    color: var(--text-color-hard);

    &:has(.hover-layer) {
      filter: saturate(1.2) brightness(0.95); /* small adjustment to the git color when also hovered */
    }
  }

  &.today.not-this-month:not(.selected-day) {
    color: color-mix(in srgb, var(--git-color) 45%, transparent);
  }

  &.selected-day {
    border-radius: var(--small-border-radius);
    background-color: var(--git-bg-color);
    color: var(--text-color-hard);
  }

  &.range-start {
    border-top-left-radius: var(--small-border-radius);
    border-bottom-left-radius: var(--small-border-radius);
  }

  &.range-end {
    border-top-right-radius: var(--small-border-radius);
    border-bottom-right-radius: var(--small-border-radius);
  }

  &.pressed-range {
    transform: translateY(1px);
  }
}

.hover-layer {
  position: absolute;
  width: 100%;
  height: 100%;
  pointer-events: none;

  background-color: var(--sidebar-hover-color);

  &.hover-range-start {
    border-top-left-radius: var(--small-border-radius);
    border-bottom-left-radius: var(--small-border-radius);
  }

  &.hover-range-end {
    border-top-right-radius: var(--small-border-radius);
    border-bottom-right-radius: var(--small-border-radius);
  }
}
</style>
