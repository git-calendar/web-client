<script setup lang="ts">
import { reactive } from 'vue';
import MultiToggle from '@/components/MultiToggle.vue';
import { CalendarCore } from '@/wasm/core-wrapper';

const emit = defineEmits(['close', 'refresh-data']);

const howOptions = ['Init', 'Clone'];
const form = reactive({
  how: 'Init',
  name: '',
  url: '',
  username: '',
  password: '',
  // decryptionKey: ''
});

async function submit() {
  switch (form.how) {
    case 'Init':
      await init();
      break;
    case 'Clone':
      await clone();
      break;
  }
}

async function init() {
  if (form.name == '') return;

  await CalendarCore.createCalendar(form.name);

  resetForm();
  emit('refresh-data');
  emit('close');
}

async function clone() {
  await CalendarCore.cloneCalendar(form.url);

  resetForm();
  emit('refresh-data');
  emit('close');
}

function resetForm() {
  form.how = howOptions[0];
  form.name = '';
  form.url = '';
}
</script>

<template>
  <div id="calendar-modal" class="modal">
    <form>
      <MultiToggle v-model="form.how" :options="howOptions" style="align-self: center" />

      <input
        type="text"
        name="name"
        :placeholder="$t('calendar.name')"
        autocomplete="none"
        :disabled="form.how != 'Init'"
        v-model="form.name"
      />

      <input
        type="text"
        name="url"
        :placeholder="`Remote URL ${form.how == 'Init' ? '(' + $t('optionalText') + ')' : ''}`"
        autocomplete="none"
        v-model="form.url"
      />

      <div class="bottom-btns">
        <button type="button" @click="submit">{{ $t('saveBtn') }}</button>
        <button type="button" @click="emit('close')">{{ $t('closeBtn') }}</button>
      </div>
    </form>
  </div>
</template>

<style scoped>
#event-modal {
  position: absolute;
  width: 100dvw;
  height: 100dvh;

  display: flex;
  justify-content: center;
  align-items: center;

  backdrop-filter: blur(5px);
  background-color: rgba(0, 0, 0, 0.3);

  z-index: 1000;

  form {
    width: 80%;
    max-width: 30rem;
    border-radius: var(--small-border-radius);
    border: 1px solid var(--btn-bg-color-hover);
    background-color: var(--bg-color);
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;

    textarea {
      resize: vertical;
      min-height: 2rem;
    }

    input,
    select {
      height: 2rem;
    }
  }
}
</style>
