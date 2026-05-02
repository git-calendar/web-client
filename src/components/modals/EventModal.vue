<script setup lang="ts">
import { ref, reactive, watch, onMounted, useTemplateRef } from 'vue';
import { Freq, UpdateStrategy, type CalendarEvent } from '@/types/core';
import { DateTime } from 'luxon';
import { CalendarCore } from '@/wasm/core-wrapper';
import { useEventModal } from '@/composables/useEventModal';
import StrategyModal from './StrategyModal.vue';
import { useStrategyModal } from '@/composables/useStrategyModal';

const repeatEndOptions = [
  { value: 'on', label: 'On' },
  { value: 'after', label: 'After' },
];
const frequencyOptions = [
  { value: Freq.Invalid, label: 'never' },
  { value: Freq.Day, label: 'daily' },
  { value: Freq.Week, label: 'weekly' },
  { value: Freq.Month, label: 'monthly' },
  { value: Freq.Year, label: 'yearly' },
];

const emit = defineEmits(['refresh-data']);
const thisModal = useEventModal();
const strategyModal = useStrategyModal();

const form = reactive({
  title: '',
  description: '',
  location: '',
  fromDate: '',
  fromTime: '',
  toDate: '',
  toTime: '',
  calendar: '',
  entireDay: false,

  repeatFreq: Freq.Invalid,
  repeatEnd: 'after',
  repeatEndOn: DateTime.now().plus({ week: 1 }).toISODate(),
  repeatEndAfter: 5,
});

const calendarNames = ref([] as string[]);

let originalEvent: CalendarEvent | undefined = undefined;
watch(
  () => thisModal.event.value,
  (newEvent) => {
    originalEvent = newEvent; // copy
    updateFormFromEvent(newEvent);
  },
  { immediate: true }, // fire right onMounted, not wait till first change
);

function updateFormFromEvent(event: CalendarEvent | undefined) {
  if (!event) return;

  form.title = event.title;
  form.location = event.location ?? '';
  form.description = event.description ?? '';

  [form.fromDate, form.fromTime] = dateTimeToIsoDateAndTime(event.from);
  [form.toDate, form.toTime] = dateTimeToIsoDateAndTime(event.to);
  form.repeatEndOn = event.from.plus({ week: 1 }).toISODate() ?? ''; // the default

  if (form.fromTime == '00:00' && form.toTime == '23:59') {
    form.entireDay = true;
    form.fromTime = '14:00'; // TODO some defaults
    form.toTime = '16:00';
  } else {
    form.entireDay = false;
  }

  if (event.repeat) {
    form.repeatFreq = event.repeat.frequency;

    if (event.repeat.count && event.repeat.count > 1) {
      form.repeatEnd = 'after';
      form.repeatEndAfter = event.repeat.count;
    } else if (event.repeat.until) {
      form.repeatEnd = 'on';
      form.repeatEndOn = event.repeat.until.toISODate() ?? '';
    } else {
      console.log('Something went wrong with the events repetition. Both Until and Count are undefined or invalid.');
    }
  }

  form.calendar = event.calendar;
}

function reconstructEvent(): CalendarEvent {
  const event: CalendarEvent = {
    id: thisModal.event.value?.id,
    title: form.title,
    location: form.location,
    description: form.description,
    calendar: form.calendar,
    tag: originalEvent!.tag, // TODO
    from: form.entireDay
      ? DateTime.fromISO(`${form.fromDate}T00:00`, { zone: originalEvent?.from.zone })
      : DateTime.fromISO(`${form.fromDate}T${form.fromTime}`, { zone: originalEvent?.from.zone }),
    to: form.entireDay
      ? DateTime.fromISO(`${form.toDate}T23:59`, { zone: originalEvent?.to.zone })
      : DateTime.fromISO(`${form.toDate}T${form.toTime}`, { zone: originalEvent?.to.zone }),
    repeat:
      form.repeatFreq != Freq.Invalid
        ? {
            frequency: form.repeatFreq,
            interval: 1,
            until:
              form.repeatEnd === 'on'
                ? DateTime.fromISO(form.repeatEndOn, { zone: originalEvent?.repeat?.until?.zone })
                : undefined,
            count: form.repeatEnd === 'after' ? form.repeatEndAfter : 0,
            exceptions: originalEvent?.repeat?.exceptions ?? [],
          }
        : undefined,
    parentId: originalEvent?.parentId,
  };
  return event;
}

function dateTimeToIsoDateAndTime(time: DateTime): [string, string] {
  const dateStr = time.toISODate() ?? '';
  const timeStr = time.toISOTime({ includeOffset: false, precision: 'minute' }) ?? '';
  return [dateStr, timeStr];
}

async function saveEvent(e: Event) {
  e.preventDefault(); // don't refresh page with button type submit

  const event = reconstructEvent();

  let newEvent: CalendarEvent;
  try {
    if (thisModal.isEventNew.value) {
      console.time('Time to create event');
      newEvent = await CalendarCore.createEvent(event);
      console.timeEnd('Time to create event');
      console.log('created event:', newEvent);
    } else if (!originalEvent?.repeat) {
      newEvent = await CalendarCore.updateEvent(event);
      console.log('updated event:', newEvent);
    } else {
      strategyModal.open('update'); // pop-up with strategy options
      return; // don't close this eventModal just yet
    }
  } catch (err) {
    alert(err);
    return;
  }

  emit('refresh-data');
  thisModal.close();
}

async function deleteEvent() {
  const event = reconstructEvent();

  try {
    if (!event.repeat) {
      console.time('Time to delete event');
      await CalendarCore.removeEvent(event);
      console.timeEnd('Time to delete event');

      console.log('deleted event:', event);
    } else {
      strategyModal.open('delete'); // pop-up with strategy options
      return; // don't close this eventModal just yet
    }
  } catch (err) {
    alert(err);
    return;
  }

  emit('refresh-data');
  thisModal.close();
}

async function updateWithStrategy(strategy: UpdateStrategy) {
  try {
    switch (strategyModal.getAction()) {
      case 'delete':
        await deleteRepeatingEvent(strategy);
        break;
      case 'update':
        await saveRepeatingEvent(strategy);
        break;
    }
  } catch (err) {
    alert(err);
    return;
  }

  emit('refresh-data');
  strategyModal.close();
  thisModal.close();
}

async function saveRepeatingEvent(strategy: UpdateStrategy) {
  const event = reconstructEvent();
  const newEvent = await CalendarCore.updateRepeatingEvent(originalEvent!, event, strategy);
  console.log('updated event with strategy:', newEvent);
}

async function deleteRepeatingEvent(strategy: UpdateStrategy) {
  const event = reconstructEvent();
  await CalendarCore.removeRepeatingEvent(event, strategy);
  console.log('deleted repeating event:', event);
}

const nameInputField = useTemplateRef('name-input-field');
onMounted(async () => {
  calendarNames.value = await CalendarCore.listCalendars();
  nameInputField.value?.focus(); // focus name field
});

// const exampleTags = ref(['School', 'Work', 'Birthday']); // TODO
// const selectedTags = ref<string[]>([]);
</script>

<template>
  <div id="event-modal" class="modal">
    <form>
      <input
        type="text"
        name="title"
        :placeholder="$t('event.title')"
        autocomplete="none"
        v-model="form.title"
        ref="name-input-field"
      />

      <div class="dates">
        <span>{{ $t('event.from') }}:</span>
        <div class="datetime">
          <input type="date" name="from-date" v-model="form.fromDate" />
          <input type="time" name="from-time" v-model="form.fromTime" v-if="!form.entireDay" />
        </div>

        <span>{{ $t('event.to') }}:</span>
        <div class="datetime">
          <input type="date" name="to-date" v-model="form.toDate" />
          <input type="time" name="to-time" v-model="form.toTime" v-if="!form.entireDay" />
        </div>
      </div>

      <label>
        {{ $t('event.entireDay') }}
        <input type="checkbox" v-model="form.entireDay" />
      </label>

      <label>
        {{ $t('event.repeat.repeat') }}:
        <select name="repeat" v-model="form.repeatFreq">
          <option v-for="freq in frequencyOptions" :value="freq.value" :key="freq.label">
            {{ $t(`event.repeat.${freq.label}`) }}
          </option>
        </select>
      </label>

      <label v-if="form.repeatFreq">
        {{ $t('event.repeat.end') }}:
        <select name="end" v-model="form.repeatEnd">
          <option v-for="end in repeatEndOptions" :value="end.value" :key="end.label">
            {{ $t(`event.repeat.end${end.label}`) }}
          </option>
        </select>

        <input v-if="form.repeatEnd == 'on'" type="date" name="end-on" v-model="form.repeatEndOn" />
        <input v-if="form.repeatEnd == 'after'" type="number" name="end-after" v-model="form.repeatEndAfter" />
      </label>

      <label>
        {{ $t('event.calendar') }}:
        <select name="calendar" v-model="form.calendar">
          <option v-for="calendarName in calendarNames" :value="calendarName" :key="calendarName">
            {{ calendarName }}
          </option>
        </select>
      </label>

      <input
        type="text"
        name="location"
        :placeholder="$t('event.location')"
        autocomplete="none"
        v-model="form.location"
      />

      <!--
      TODO tags
      <div>
        <label v-for="tagName in exampleTags" :key="tagName">
          <input type="checkbox" name="idk" :value="tagName" v-model="selectedTags" />
          {{ tagName }}
        </label>
      </div>
      -->

      <textarea name="description" rows="3" :placeholder="$t('event.description')" v-model="form.description" />

      <div class="bottom-btns">
        <button type="submit" @click="saveEvent">{{ $t('saveBtn') }}</button>
        <button type="button" @click="thisModal.close">{{ $t('closeBtn') }}</button>
        <button v-if="!thisModal.isEventNew.value" type="button" @click="deleteEvent" class="delete-btn">
          {{ $t('deleteBtn') }}
        </button>
      </div>
    </form>
  </div>

  <StrategyModal v-if="strategyModal.isOpen.value" @cancel-update="strategyModal.close" @update="updateWithStrategy" />
</template>

<style scoped>
label:has(select[name='end']) {
  margin-left: 4.3rem;

  input[name='end-after'] {
    width: 5rem;
  }

  input[name='end-on'] {
    width: 10rem;
  }
}

label:has(select) {
  display: flex;
  align-items: center;
  gap: 0.8rem;

  select {
    width: 100%;
  }
}

.dates {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.7rem;

  > span {
    align-self: center;
  }
}

.datetime {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.7rem;
}

.delete-btn {
  border: 1px solid var(--git-color);
  background-color: var(--btn-red-bg-color);

  &:hover:not(:focus):not(:disabled) {
    background-color: var(--btn-red-bg-color-hover);
  }
}

@media (max-width: 450px) {
  label:has(select[name='end']) {
    margin-left: 1.5rem;
  }
}
</style>
