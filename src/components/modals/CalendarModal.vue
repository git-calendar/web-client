<script setup lang="ts">
import { reactive } from 'vue';
import MultiToggle from '@/components/MultiToggle.vue';
import { CalendarCore } from '@/wasm/core-wrapper';
import { useCalendarModal } from '@/composables/useCalendarModal';

const emit = defineEmits(['refresh-data']);
const thisModal = useCalendarModal();

const howOptions = ['Init', 'Clone'];
const form = reactive({
  how: 'Init',
  name: '',
  url: '',
  username: '',
  password: '',
  encrypted: false,
  decryptionKey: '',
});
const errors = reactive({
  missingName: false,
  missingURL: false,
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
  if (form.name == '') {
    errors.missingName = true;
    return;
  }

  await CalendarCore.createCalendar(form.name, form.decryptionKey);

  resetForm();
  emit('refresh-data');
  thisModal.close();
}

async function clone() {
  if (form.url == '') {
    errors.missingURL = true;
    return;
  }

  await CalendarCore.cloneCalendar(urlWithAuth(form.url, form.username, form.password), form.decryptionKey);
  await CalendarCore.loadCalendars();

  resetForm();
  emit('refresh-data');
  thisModal.close();
}

function resetForm() {
  form.how = howOptions[0];
  form.name = '';
  form.url = '';
  form.username = '';
  form.password = '';
  form.encrypted = false;
  form.decryptionKey = '';
}

function urlWithAuth(repoUrl: string, username: string, password: string): string {
  const url = new URL(repoUrl);

  if (!username) {
    // token-only style
    url.username = encodeURIComponent(password);
    url.password = '';
  } else {
    url.username = encodeURIComponent(username);
    url.password = encodeURIComponent(password);
  }

  return url.toString();
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
        :class="{ red: errors.missingName && form.how == 'Init' }"
        @input="errors.missingName = false"
      />

      <input
        type="url"
        name="url"
        :placeholder="`Remote URL ${form.how == 'Init' ? '(' + $t('optionalText') + ')' : ''}`"
        autocomplete="none"
        v-model="form.url"
        :class="{ red: errors.missingURL && form.how == 'Clone' }"
        @input="errors.missingURL = false"
      />

      <div id="git-credentials">
        {{ $t('calendar.gitCredentials') }}
        <div>
          <input type="text" name="username" :placeholder="$t('calendar.username')" v-model="form.username" />
          <input type="password" name="password" :placeholder="$t('calendar.password')" v-model="form.password" />
        </div>
      </div>

      <label>
        {{ $t('calendar.encrypted') }}
        <input type="checkbox" v-model="form.encrypted" />
      </label>

      <input
        v-if="form.encrypted"
        type="password"
        name="decryption-key"
        :placeholder="$t('calendar.decryptionKey')"
        autocomplete="current-password"
        v-model="form.decryptionKey"
      />

      <div class="bottom-btns">
        <button type="button" @click="submit">{{ $t('saveBtn') }}</button>
        <button type="button" @click="thisModal.close">{{ $t('closeBtn') }}</button>
      </div>
    </form>
  </div>
</template>

<style scoped>
#calendar-modal {
  form {
    > #git-credentials {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;

      > div {
        width: 100%;
        display: flex;
        gap: 1rem;
        justify-content: stretch;

        > * {
          flex: 1;
          width: 100%;
        }
      }
    }
  }
}

input.red {
  border: 1px solid var(--git-color);
}
</style>
