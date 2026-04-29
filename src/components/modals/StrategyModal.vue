<script setup lang="ts">
import { UpdateStrategy } from '@/types/core';
import StrategySVG from '@/components/StrategySVG.vue';

const emit = defineEmits<{
  (e: 'update', strategy: UpdateStrategy): void;
  (e: 'cancel-update'): void;
}>();

function submit(strat: UpdateStrategy) {
  emit('update', strat);
}

function cancel() {
  emit('cancel-update');
}
</script>

<template>
  <div id="strategy-modal" class="modal">
    <form>
      <h2>{{ $t('strategy.title') }}</h2>

      <button type="button" @click="submit(UpdateStrategy.All)">
        <div class="name">
          <StrategySVG :strategy="UpdateStrategy.All" />
          {{ $t('strategy.all.title') }}
        </div>
        <p>{{ $t('strategy.all.body') }}</p>
      </button>
      <button type="button" @click="submit(UpdateStrategy.Following)">
        <div class="name">
          <StrategySVG :strategy="UpdateStrategy.Following" />
          {{ $t('strategy.following.title') }}
        </div>
        <p>{{ $t('strategy.following.body') }}</p>
      </button>
      <button type="button" @click="submit(UpdateStrategy.Current)">
        <div class="name">
          <StrategySVG :strategy="UpdateStrategy.Current" />
          {{ $t('strategy.current.title') }}
        </div>
        <p>{{ $t('strategy.current.body') }}</p>
      </button>

      <button type="button" @click="cancel">{{ $t('cancelBtn') }}</button>
    </form>
  </div>
</template>

<style scoped>
h2 {
  font-size: 1.2rem;
  align-self: center;
}

button {
  height: auto;
  display: flex;
  align-items: center;
  gap: 1rem;

  .name {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    width: 10rem;
    font-weight: 700;

    .rects {
      width: 100%;
    }
  }

  p {
    width: 100%;
    word-wrap: break-word;
  }

  &:last-of-type {
    align-self: center;
  }

  &:not(:last-of-type) {
    padding: 1rem;
  }
}
</style>
