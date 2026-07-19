<script setup lang="ts">
import { computed, onMounted, reactive, useTemplateRef } from 'vue';
import { useI18n } from 'vue-i18n';
import { DateTime } from 'luxon';
import { RRule } from 'rrule';

const props = defineProps<{
  modelValue: RRule;
  startDate: string;
}>();

const emit = defineEmits<{
  save: [value: RRule];
  cancel: [];
}>();

const { locale } = useI18n();
const rule = props.modelValue.options;
const startDate = DateTime.fromISO(props.startDate);
const ruleWeekdays = Array.isArray(rule.byweekday) ? rule.byweekday : [];
const initialWeekdays = ruleWeekdays.length > 0 ? ruleWeekdays : startDate.isValid ? [startDate.weekday - 1] : [];

const form = reactive({
  frequency: rule.freq,
  interval: rule.interval,
  weekdays: [...initialWeekdays],
  end: rule.until ? 'on' : 'after',
  endAfter: rule.count || 5,
  endOn: rule.until
    ? (DateTime.fromJSDate(rule.until).toISODate() ?? '')
    : (startDate.plus({ week: 1 }).toISODate() ?? ''),
});

const intlLocale = computed(() => Intl.DateTimeFormat.supportedLocalesOf(locale.value)[0] ?? 'en');

function unitLabel(unit: 'day' | 'week' | 'month' | 'year'): string {
  return (
    new Intl.NumberFormat(intlLocale.value, { style: 'unit', unit, unitDisplay: 'long' })
      .formatToParts(2)
      .find((part) => part.type === 'unit')?.value ?? unit
  );
}

const frequencyOptions = computed(() => [
  { value: RRule.DAILY, label: unitLabel('day') },
  { value: RRule.WEEKLY, label: unitLabel('week') },
  { value: RRule.MONTHLY, label: unitLabel('month') },
  { value: RRule.YEARLY, label: unitLabel('year') },
]);

const weekdays = computed(() =>
  Array.from({ length: 7 }, (_, weekday) => ({
    value: weekday,
    label: new Intl.DateTimeFormat(intlLocale.value, { weekday: 'short', timeZone: 'UTC' }).format(
      new Date(Date.UTC(2024, 0, weekday + 1)),
    ),
  })),
);

const canSave = computed(() => {
  if (!Number.isInteger(form.interval) || form.interval < 1) return false;
  if (form.frequency === RRule.WEEKLY && form.weekdays.length === 0) return false;

  if (form.end === 'after') return Number.isInteger(form.endAfter) && form.endAfter > 0;

  const endDate = DateTime.fromISO(form.endOn);
  return endDate.isValid && (!startDate.isValid || endDate.startOf('day') >= startDate.startOf('day'));
});

function toggleWeekday(weekday: number) {
  if (form.weekdays.includes(weekday)) {
    form.weekdays = form.weekdays.filter((day) => day !== weekday);
  } else {
    form.weekdays = [...form.weekdays, weekday].sort();
  }
}

function save() {
  if (!canSave.value) return;

  emit(
    'save',
    new RRule({
      freq: form.frequency,
      dtstart: startDate.isValid ? startDate.toJSDate() : undefined,
      interval: form.interval,
      byweekday: form.frequency === RRule.WEEKLY ? form.weekdays : undefined,
      count: form.end === 'after' ? form.endAfter : undefined,
      until: form.end === 'on' ? DateTime.fromISO(form.endOn).toJSDate() : undefined,
    }),
  );
}

const intervalInput = useTemplateRef('interval-input');
onMounted(() => intervalInput.value?.focus());
</script>

<template>
  <div
    id="repeat-modal"
    class="modal"
    role="dialog"
    aria-modal="true"
    aria-labelledby="repeat-modal-title"
    @keydown.esc.stop.prevent="emit('cancel')"
  >
    <form @submit.prevent="save">
      <h2 id="repeat-modal-title">{{ $t('event.repeat.repeat') }}</h2>

      <label class="row">
        {{ $t('event.repeat.every') }}:
        <input
          v-model.number="form.interval"
          ref="interval-input"
          type="number"
          name="repeat-interval"
          min="1"
          step="1"
          required
          :aria-label="$t('event.repeat.every')"
        />
        <select v-model="form.frequency" name="repeat-frequency" :aria-label="$t('event.repeat.repeat')">
          <option v-for="option in frequencyOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </label>

      <div v-if="form.frequency === RRule.WEEKLY" class="row">
        <span>{{ $t('event.repeat.on') }}:</span>
        <div class="weekdays">
          <button
            v-for="weekday in weekdays"
            :key="weekday.value"
            type="button"
            :class="{ selected: form.weekdays.includes(weekday.value) }"
            :aria-pressed="form.weekdays.includes(weekday.value)"
            @click="toggleWeekday(weekday.value)"
          >
            {{ weekday.label }}
          </button>
        </div>
      </div>

      <div class="ends">
        <span>{{ $t('event.repeat.ends') }}:</span>
        <label>
          <input v-model="form.end" type="radio" name="repeat-end" value="after" />
          {{ $t('event.repeat.endAfter') }}:
          <input
            v-model.number="form.endAfter"
            type="number"
            name="repeat-end-after"
            min="1"
            step="1"
            :disabled="form.end !== 'after'"
            :aria-label="$t('event.repeat.endAfter')"
            required
          />
          {{ $t('event.repeat.times') }}
        </label>
        <label>
          <input v-model="form.end" type="radio" name="repeat-end" value="on" />
          {{ $t('event.repeat.endOn') }}:
          <input
            v-model="form.endOn"
            type="date"
            name="repeat-end-on"
            :min="props.startDate"
            :disabled="form.end !== 'on'"
            :aria-label="$t('event.repeat.endOn')"
            required
          />
        </label>
      </div>

      <div class="bottom-btns">
        <button type="submit" :disabled="!canSave">{{ $t('saveBtn') }}</button>
        <button type="button" @click="emit('cancel')">{{ $t('cancelBtn') }}</button>
      </div>
    </form>
  </div>
</template>

<style scoped>
#repeat-modal {
  > form {
    min-width: 26rem;
    width: auto;
  }
}

h2 {
  align-self: center;
  font-size: 1.2rem;
}

.row,
.ends label {
  display: flex;
  align-items: center;
  gap: 0.7rem;
}

input[type='number'] {
  width: 5rem;
}

.weekdays {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.weekdays .selected,
.weekdays .selected:hover:not(:focus):not(:disabled) {
  background-color: var(--btn-bg-color-checked);
}

.ends {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.7rem;
}

.ends > span {
  align-self: center;
}

.ends label {
  grid-column: 2;
  cursor: pointer;
}

input[type='radio'] {
  width: 1rem;
  height: 1rem;
  padding: 0;
  border: 0.2rem solid var(--sidebar-btn-bg-color);
  border-radius: 50%;
}

input[type='radio']:hover:not(:focus):not(:disabled) {
  background-color: var(--btn-bg-color);
  filter: brightness(140%);
}

input[type='radio']:checked,
input[type='radio']:checked:hover:not(:focus):not(:disabled) {
  background-color: var(--text-color);
}
</style>
