<script setup lang="ts">
import { FiPlus, FiEdit2 } from 'vue-icons-plus/fi';
import { ref } from 'vue';
import { useCalendarModal } from '@/composables/modals/useCalendarModal';
import { useTagModal } from '@/composables/modals/useTagModal';
import { cachedCalendars, getTag } from '@/services/calendarCache';
import { getEventColorCSSVariable, toColorId } from '@/colors';

const calendarModal = useCalendarModal();
const tagModal = useTagModal();
const hidden = ref(new Map<string, boolean>());

function getCalId(calName: string): string {
  return `cal_${calName}`;
}

function getTagId(calName: string, tagName: string): string {
  return `tag_${calName}_${tagName}`;
}

function toggleVisibility(id: string) {
  hidden.value.set(id, !(hidden.value.get(id) ?? false));
}

function isVisible(id: string): boolean {
  return !(hidden.value.get(id) ?? false);
}

function getTagColor(calName: string, tagId?: string) {
  const tag = getTag(calName, tagId ?? '');
  return getEventColorCSSVariable(toColorId(tag?.color));
}
</script>

<template>
  <div class="calendars">
    <div class="top-bar">
      <span class="title">{{ $t('calendarsTitle') }}:</span>
      <button class="create-new" @click="calendarModal.open()">
        <FiPlus />
      </button>
    </div>

    <div class="calendar-list">
      <div v-for="cal in cachedCalendars" :key="cal.name" class="calendar-wrap">
        <div class="calendar">
          <label>
            <input
              type="checkbox"
              :id="getCalId(cal.name)"
              :name="getCalId(cal.name)"
              :checked="isVisible(cal.name)"
              @change="toggleVisibility(cal.name)"
            />
            <span class="name">{{ cal.name }}</span>
          </label>

          <button class="edit-btn" @click="calendarModal.open(cal.name)">
            <FiEdit2 />
          </button>
        </div>

        <div v-if="isVisible(cal.name)" class="tags-list">
          <div class="tag" v-for="tag in cal.tags" :key="tag.name">
            <label>
              <input
                type="checkbox"
                :id="getTagId(cal.name, tag.name)"
                :name="getTagId(cal.name, tag.name)"
                :checked="isVisible(getTagId(cal.name, tag.name))"
                @change="toggleVisibility(getTagId(cal.name, tag.name))"
                :style="{ '--tag-color': getTagColor(cal.name, tag.id) }"
              />
              <span class="tag-name">{{ tag.name }}</span>
            </label>

            <button class="edit-btn" @click="tagModal.open(cal.name, tag)">
              <FiEdit2 />
            </button>
          </div>
          <div class="tag new" @click="tagModal.open(cal.name)">
            <FiPlus />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.calendars {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  min-height: 0;
}
.calendar-list {
  --fade-size: 2rem;

  height: 100%;
  min-height: 0;
  padding-bottom: var(--fade-size); /* leaves space at the bottom so that the shadow isnt always visible */

  overflow-y: auto;
  overflow-x: hidden;

  /* hide scrollbar: firefox */
  scrollbar-width: none;
  /* hide scrollbar: old edge/IE */
  -ms-overflow-style: none;
  /* hide scrollbar: chrome, safari, edge */
  &::-webkit-scrollbar {
    display: none;
  }

  /* fade out bottom content */
  -webkit-mask-image: linear-gradient(to bottom, #000 0, #000 calc(100% - var(--fade-size)), transparent 100%);
  mask-image: linear-gradient(to bottom, #000 0, #000 calc(100% - var(--fade-size)), transparent 100%);
}

.top-bar {
  display: flex;
  align-items: center;
  padding-left: 0.4rem;
  justify-content: space-between;

  .title {
    font-weight: bold;
  }

  .create-new {
    width: 1.8rem;
    height: 1.8rem;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.25rem;
    background-color: transparent;

    &:hover {
      background-color: var(--sidebar-hover-color);
    }
  }
}

.calendar-wrap {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;

  .calendar {
    height: 2rem;
    padding-right: 0.25rem;

    label {
      display: flex;
      align-items: center;
      gap: 0.7rem;
      cursor: pointer;
      user-select: none;
      flex-grow: 1;
      padding: 0.3rem;
    }

    .name {
      font-weight: 500;
    }
  }
}

.calendar,
.tag {
  display: flex;
  align-items: center;
  border-radius: var(--small-border-radius);

  &:hover {
    background-color: var(--sidebar-hover-color);

    /* reveal the edit button on row hover */
    .edit-btn {
      opacity: 1;
      pointer-events: auto;
    }
  }
}

.edit-btn {
  height: 76%;
  aspect-ratio: 1/1;
  padding: 0.25rem;
  background-color: transparent;
  border-radius: var(--small-border-radius);
  cursor: pointer;

  /* hidden by default until hovered */
  opacity: 0;
  pointer-events: none;

  &:hover:not(:disabled) {
    background-color: color-mix(in srgb, var(--sidebar-color), white 20%);
  }
}

.tags-list {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  padding-left: 1.8rem;

  .tag {
    padding-right: 0.25rem;
    height: 1.7rem;

    label,
    &.new {
      display: flex;
      padding: 0.25rem 0.4rem;
      align-items: center;
      gap: 0.5rem;
      border-radius: var(--small-border-radius);
      cursor: pointer;
      user-select: none;
      flex-grow: 1;

      input[type='checkbox']:checked::before {
        background-color: var(--tag-color);
      }
    }

    .name {
      font-size: 0.9em;
      opacity: 0.85;
    }

    .edit-btn {
      padding: 0.15rem;
    }
  }
}

.tag.new {
  width: max-content;

  svg {
    transform: scale(1.3);
    width: 1rem;
    height: 1rem;
  }
}
</style>
