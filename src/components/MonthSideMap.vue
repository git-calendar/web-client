<script setup lang="ts">
import { useSettings } from '@/composables/useSettings';
import { useTranslation } from '@/composables/useTranslation';
import router from '@/router';
import { getCurrentViewDatetime, getStartOfWeek, getViewLengthInDays, getWeekAlignedRedirect } from '@/utils';
import { DateTime } from 'luxon';
import { computed, ref, watch } from 'vue';
import { FiChevronDown, FiChevronUp } from 'vue-icons-plus/fi';
import { useRoute } from 'vue-router';

const { monthNameLong } = useTranslation();
const route = useRoute();
const { settings } = useSettings();

const currentDatetime = ref<DateTime>(DateTime.now());
const monthTracker = ref(currentDatetime.value.month);
const yearTracker = ref(currentDatetime.value.year);

const viewInterval = computed(() => {
  const start = currentDatetime.value;
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

  const result: DateTime[] = [];

  // adjust weekday based on custom week start
  const weekday = firstOfTheMonth.weekday; // 1–7 (Mon–Sun)
  const weekStart = settings.value.weekStart; // 1–7

  const numOfDaysFromLastMonth = (weekday - weekStart + 7) % 7;

  // trailing days from previous month
  for (let i = numOfDaysFromLastMonth; i > 0; i--) {
    result.push(firstOfTheMonth.minus({ days: i }));
  }

  // fill remaining cells (6×7 = 42)
  const moreDaysNeeded = 6 * 7 - result.length;
  for (let i = 0; i < moreDaysNeeded; i++) {
    result.push(firstOfTheMonth.plus({ days: i }));
  }

  return result;
});

watch(
  () => route.params,
  () => {
    currentDatetime.value = getCurrentViewDatetime(route.params);

    // make sure that the highlited interval is always fully visible
    if (viewInterval.value.end > days.value[days.value.length - 1] || viewInterval.value.start < days.value[0]) {
      monthTracker.value = currentDatetime.value.month;
      yearTracker.value = currentDatetime.value.year;
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
  if (route.params.view === 'week') {
    router.replace(getWeekAlignedRedirect(clickedDay));
  } else {
    router.replace({ params: { year: clickedDay.year, month: clickedDay.month, day: clickedDay.day } });
  }
}

const hoveredDay = ref<DateTime | null>(null);

const hoverInterval = computed(() => {
  if (!hoveredDay.value) return null;

  if (route.params.view === 'week') {
    const startOfWeek = getStartOfWeek(hoveredDay.value);
    return {
      start: startOfWeek,
      end: startOfWeek.plus({ days: 6 }),
    };
  } else {
    const length = getViewLengthInDays(route.params);
    return {
      start: hoveredDay.value,
      end: hoveredDay.value.plus({ days: length - 1 }),
    };
  }
});
</script>

<template>
  <div id="month-side-map">
    <div class="container">
      <span id="month-name">
        {{ `${monthNameLong(DateTime.now().set({ month: monthTracker }))} ${yearTracker}` }}
      </span>
      <span id="month-nav">
        <button @click="changeMonthNum(false)"><FiChevronUp /></button>
        <button @click="changeMonthNum(true)"><FiChevronDown /></button>
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
          'not-this-month': d.month !== monthTracker,
          'in-range': d >= viewInterval.start && d <= viewInterval.end,
          'range-start': d.hasSame(viewInterval.start, 'day'),
          'range-end': d.hasSame(viewInterval.end, 'day'),
        }"
        @click="jumpToInterval(d)"
        @mouseenter="hoveredDay = d"
        @mouseleave="hoveredDay = null"
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

    /* the dot */
    &::after {
      content: '';
      position: absolute;
      bottom: 4px;
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background-color: currentColor;
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
    color: var(--text-color-hard);

    &:has(.hover-layer) {
      filter: saturate(1.2) brightness(0.95); /* small adjustment to the git color when also hovered */
    }
  }

  &.range-start {
    border-top-left-radius: var(--small-border-radius);
    border-bottom-left-radius: var(--small-border-radius);
  }

  &.range-end {
    border-top-right-radius: var(--small-border-radius);
    border-bottom-right-radius: var(--small-border-radius);
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
