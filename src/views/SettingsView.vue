<script setup lang="ts">
import { useSettings } from '@/composables/useSettings';
import { useTranslation } from '@/composables/useTranslation';
import { DateTime, type WeekdayNumbers } from 'luxon';
import { LANGUAGES } from '@/constants.ts';
import { CalendarCore } from '@/wasm/core-wrapper';

const { settings } = useSettings();
const { dayNameLong } = useTranslation();

async function setCorsProxy() {
  try {
    await CalendarCore.setCorsProxy(settings.value.corsProxyURL);
    console.log('Saved cors proxy', settings.value.corsProxyURL);
  } catch {
    alert('Invalid CORS Proxy URL!');
  }
}
</script>

<template>
  <form>
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
        <option value="h11">{{ $t('settings.12hourFormat') }}</option>
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
      {{ $t('settings.dragPrecision') }}:
      <select name="drap-precision" v-model="settings.dragPrecisionMinutes">
        <option value="15">15min</option>
        <option value="30">30min</option>
        <option value="60">60min</option>
      </select>
    </label>

    <label>
      {{ $t('settings.themes.theme') }}:
      <select name="theme" v-model="settings.theme">
        <option value="auto">{{ $t('settings.themes.auto') }}</option>
        <option value="light">{{ $t('settings.themes.light') }}</option>
        <option value="dark">{{ $t('settings.themes.dark') }}</option>
      </select>
    </label>

    <label>
      CORS Proxy:
      <input type="text" name="cors-proxy" @change="setCorsProxy" v-model="settings.corsProxyURL" />
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
  }
}

option {
  span {
    color: red;
  }
}
</style>
