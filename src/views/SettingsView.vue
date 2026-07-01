<script setup lang="ts">
import { useTranslation } from '@/composables/useTranslation';
import { DateTime, type WeekdayNumbers } from 'luxon';
import { DRAG_PRECISIONS, LANGUAGES, THEMES } from '@/constants.ts';
import { CalendarCore } from '@/wasm/core-wrapper';
import { useAlertModal } from '@/composables/modals/useAlertModal';
import { settings } from '@/services/settings';
import { colorsList, getColorI18nKey } from '@/colors';

const { dayNameLong } = useTranslation();
const { alert } = useAlertModal();

async function setCorsProxy() {
  try {
    await CalendarCore.setCorsProxy(settings.value.corsProxyURL);
    console.log('Saved cors proxy', settings.value.corsProxyURL);
  } catch {
    alert('Invalid CORS Proxy URL!');
  }
}

function formatHour(hour: number): string {
  if (settings.value.timeFormat !== 'h12') {
    return `${hour.toString().padStart(2, '0')}:00`;
  }
  if (hour === 0 || hour === 24) return '12 AM';
  if (hour === 12) return '12 PM';
  return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
}
</script>

<template>
  <!-- disable enter to submit -->
  <form onsubmit="return false;">
    <RouterLink to="/">&lt; Back to calendar</RouterLink>

    <label
      >{{ $t('settings.language') }}:
      <select v-model="settings.language">
        <option v-for="lang in LANGUAGES" :key="lang.code" :value="lang.code">
          {{ lang.label }}
        </option>
      </select>
    </label>

    <label>
      {{ $t('settings.timeFormat') }}:
      <select name="time-format" v-model="settings.timeFormat">
        <option value="h12">{{ $t('settings.12hourFormat') }}</option>
        <option value="h23">{{ $t('settings.24hourFormat') }}</option>
      </select>
    </label>

    <label>
      {{ $t('settings.weekStart') }}:
      <select name="week-start" v-model="settings.weekStart">
        <option v-for="i in 7" :key="i" :value="i">
          {{ dayNameLong(DateTime.now().set({ weekday: i as WeekdayNumbers })) }}
        </option>
      </select>
    </label>

    <label>
      {{ $t('settings.hourRange') }}:
      <select name="day-view-start-hour" v-model="settings.dayViewStartHour">
        <option v-for="h in 25" :key="h - 1" :value="h - 1">{{ formatHour(h - 1) }}</option>
      </select>
      –
      <select name="day-view-end-hour" v-model="settings.dayViewEndHour">
        <option v-for="h in 25" :key="h - 1" :value="h - 1">{{ formatHour(h - 1) }}</option>
      </select>
    </label>

    <label>
      {{ $t('settings.dragPrecision') }}:
      <select name="drap-precision" v-model="settings.dragPrecisionMinutes">
        <option v-for="v in DRAG_PRECISIONS" :value="v">{{ v }}min</option>
      </select>
    </label>

    <label>
      {{ $t('settings.themes.theme') }}:
      <select name="theme" v-model="settings.theme">
        <option v-for="t in THEMES" :value="t">{{ $t('settings.themes.' + t) }}</option>
      </select>
    </label>

    <!-- TODO: prettier color picker -->
    <label>
      {{ $t('tag.color') }}:
      <select name="color" id="color" v-model="settings.defaultEventColor">
        <option v-for="color in colorsList" :key="color" :value="color">
          {{ $t(getColorI18nKey(color)) }}
        </option>
      </select>
    </label>

    <label>
      CORS Proxy:
      <input
        type="text"
        name="cors-proxy"
        @change="setCorsProxy"
        v-model="settings.corsProxyURL"
        placeholder="https://..."
      />
    </label>
  </form>
</template>

<style scoped>
form {
  justify-content: center;
  justify-items: start;
  padding: 2rem;
  display: grid;
  gap: 1rem;

  > label {
    width: auto;

    > input[name='cors-proxy'] {
      width: 12rem;
    }
  }
}
</style>
