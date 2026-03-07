<script setup lang="ts">
import { ref, reactive, watch } from 'vue';
import { type CalendarEvent } from '@/types/core';
import { DateTime } from 'luxon';
import { CalendarCore } from '@/wasm/core-wrapper';

interface Props {
  event?: CalendarEvent;
}
const props = defineProps<Props>();
const emit = defineEmits(['close', 'refresh-data']);

const form = reactive({
  title: '',
  description: '',
  location: '',
  fromDate: '',
  fromTime: '',
  toDate: '',
  toTime: '',
  calendar: '',
  wholeDay: false,
});

watch(() => props.event, updateFormFromEvent, { immediate: true });

function updateFormFromEvent(event?: CalendarEvent) {
  if (!event) return;

  form.title = event.title;
  form.location = event.location!;

  form.fromDate = event.from.toISODate() ?? '';
  form.toDate = event.to.toISODate() ?? '';

  form.fromTime = event.from.toISOTime({ includeOffset: false, precision: 'minute' }) ?? '';
  form.toTime = event.to.toISOTime({ includeOffset: false, precision: 'minute' }) ?? '';

  form.calendar = event.calendar;
}

function reconstructEvent(): CalendarEvent {
  let event = props.event ?? ({} as CalendarEvent);

  event.title = form.title;
  event.location = form.location;

  event.from = DateTime.fromISO(`${form.fromDate}T${form.fromTime}`);
  event.to = DateTime.fromISO(`${form.toDate}T${form.toTime}`);

  event.calendar = form.calendar;

  return event;
}

async function saveEvent() {
  const event = reconstructEvent();
  if (props.event != undefined && props.event.id != undefined) {
    // already existed
    const e = await CalendarCore.updateEvent(event);
    console.log('updated event:', e);
  } else {
    // didnt exist; create
    const e = await CalendarCore.createEvent(event);
    console.log('created event:', e);
  }

  emit('refresh-data');
  emit('close');
}

async function deleteEvent() {
  const event = reconstructEvent();
  await CalendarCore.removeEvent(event);
  emit('refresh-data');
  emit('close');
}

// const exampleTags = ref(['School', 'Work', 'Birthday']); // TODO
// const selectedTags = ref<string[]>([]);
const exampleCalendars = ref(['Main', 'Shared']); // TODO
</script>

<template>
  <div id="event-modal">
    <form>
      <input type="text" name="title" :placeholder="$t('event.title')" autocomplete="none" v-model="form.title" />

      <div class="datetime">
        <span>{{ $t('event.from') }}:</span>
        <input type="date" name="from-date" v-model="form.fromDate" />
        <input type="time" name="from-time" v-model="form.fromTime" v-if="!form.wholeDay" />
      </div>

      <div class="datetime">
        <span>{{ $t('event.to') }}:</span>
        <input type="date" name="to-date" v-model="form.toDate" />
        <input type="time" name="to-time" v-model="form.toTime" v-if="!form.wholeDay" />
      </div>

      <!--
      TODO styling
      <label>
        {{ $t('event.wholeDay') }}
        <input type="checkbox" v-model="form.wholeDay" />

      </label>
      -->

      <input type="text" name="location" :placeholder="$t('event.location')" v-model="form.location" />

      <select name="calendar" id="" v-model="form.calendar">
        <option v-for="calendarName in exampleCalendars" :value="calendarName" :key="calendarName">
          {{ calendarName }}
        </option>
      </select>

      <!--
      TODO tags and calendar select
      <div>
        <label v-for="tagName in exampleTags" :key="tagName">
          <input type="checkbox" name="idk" :value="tagName" v-model="selectedTags" />
          {{ tagName }}
        </label>
      </div>
      -->

      <textarea name="description" rows="3" :placeholder="$t('event.description')" v-model="form.description" />

      <div class="bottom-btns">
        <button type="button" @click="saveEvent">{{ $t('saveBtn') }}</button>
        <button type="button" @click="emit('close')">{{ $t('closeBtn') }}</button>
        <button v-if="event && event.id && event.id.length" type="button" @click="deleteEvent" class="delete-btn">
          {{ $t('deleteBtn') }}
        </button>
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
  }
}

.datetime {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.bottom-btns {
  justify-content: center;

  display: flex;
  gap: 1rem;
}

.delete-btn {
  border: 1px solid var(--git-color);
  background-color: var(--btn-red-bg-color);

  &:hover {
    background-color: var(--btn-red-bg-color-hover);
  }
}
</style>
