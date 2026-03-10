<script setup lang="ts">
import { moveView } from '@/utils';
import { DateTime } from 'luxon';
import { FiChevronLeft, FiChevronRight } from 'vue-icons-plus/fi';
import { useRouter } from 'vue-router';

const router = useRouter();

const today = DateTime.now();
</script>

<template>
  <header>
    <slot />

    <!-- TODO <MultiToggle v-model="idk" :options="['4days', 'Week', 'Month']" style="align-self: center" /> -->

    <div id="view-btns">
      <router-link :to="{ name: 'calendar', params: { year: today.year, month: today.month, day: today.day } }">
        {{ $t('todayBtn') }}
      </router-link>
      <router-link :to="{ name: 'calendar', params: { view: '4days' } }" :class="{ disabled: true }">
        {{ $t('views.4days') }}
      </router-link>
      <router-link :to="{ name: 'calendar', params: { view: 'week' } }">
        {{ $t('views.week') }}
      </router-link>
      <router-link :to="{ name: 'calendar', params: { view: 'month' } }" :class="{ disabled: true }">
        {{ $t('views.month') }}
      </router-link>
    </div>
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
  gap: 1rem;

  padding: 0.5rem 0.7rem;
  grid-area: topbar;
}

#view-btns {
  display: flex;
  gap: 0.5rem;

  > .disabled {
    opacity: 0.5;
    pointer-events: none;
  }
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
