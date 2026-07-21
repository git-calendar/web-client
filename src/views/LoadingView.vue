<script setup lang="ts">
import { CoreLoadingState } from '@/wasm/core-wrapper';
</script>

<template>
  <Transition name="fade">
    <div v-if="CoreLoadingState.percentage < 100" id="loader">
      <div class="loader-content">
        <img src="/favicon.svg" class="logo" alt="Logo" />

        <div class="progress-container">
          <div class="progress-track">
            <div class="progress-fill" :style="{ width: `${CoreLoadingState.percentage}%` }" />
          </div>

          <div class="status-text">
            <span class="message">{{
              $t(`loading.${CoreLoadingState.textId ?? 'loading'}`) + ` ${CoreLoadingState.other}`
            }}</span>
            <span class="percentage">{{ CoreLoadingState.percentage }}%</span>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
#loader {
  position: fixed;
  inset: 0;
  z-index: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-color);
}

.loader-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 15rem;
  gap: 2.5rem;
}

.logo {
  width: 8rem;
  height: 8rem;
}

.progress-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.progress-track {
  width: 100%;
  height: 4px;
  background: var(--btn-bg-color);
  border-radius: 1000rem;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--git-color);
  transition: width 0.1s ease-out;
}

.status-text {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8rem;
}

.message {
  opacity: 0.6;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.percentage {
  font-weight: 600;
  margin-left: 1rem;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
