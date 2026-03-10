<script setup lang="ts">
import { CalendarCore } from '@/wasm/core-wrapper';
import { onMounted, ref } from 'vue';

const emit = defineEmits(['refresh-data']);

onMounted(async () => {
  // const uid = uuidv4();
  // // await CalendarCore.createEvent({
  // //   id: uid,
  // //   from: DateTime.now(),
  // //   to: DateTime.now().plus({ hour: 2 }),
  // //   title: 'Meeting',
  // //   location: '',
  // // });
  // let e: CalendarEvent = await CalendarCore.getEvent(uid);
  // console.log(e.from.hour);
});

const cloneUrl = ref('');

async function cloneAndRefresh() {
  if (cloneUrl.value == '') {
    alert('No repo url');
    return;
  }

  await CalendarCore.cloneCalendar(cloneUrl.value);
  await CalendarCore.loadCalendars();
  emit('refresh-data');
}

async function createAndRefresh() {
  await CalendarCore.createCalendar('main');
  await CalendarCore.loadCalendars();
  emit('refresh-data');
}

async function removeAndRefresh() {
  await CalendarCore.removeCalendar('main');
  await CalendarCore.loadCalendars();
  emit('refresh-data');
}
</script>

<template>
  <div class="container">
    <span>Git Testing:</span>
    <div id="git-testing-btns">
      <button @click="createAndRefresh">Create main cal</button>
      <button @click="removeAndRefresh">Delete main cal</button>

      <div>
        <input type="text" v-model="cloneUrl" placeholder="repo url" />
        <button @click="cloneAndRefresh">Clone</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
#git-testing-btns {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.3rem;

  button {
    background-color: color-mix(in srgb, var(--btn-bg-color), white 5%);
    &:hover {
      background-color: color-mix(in srgb, var(--btn-bg-color-hover), white 5%);
    }
  }
}

.container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  align-items: center;

  > span {
    font-weight: 500;
  }

  > div > div {
    display: flex;
    gap: 0.4rem;

    input {
      width: 100%;
    }
  }
}
</style>
