<script setup lang="ts">
import { FiPlus, FiEdit2 } from 'vue-icons-plus/fi';
import { useCalendarModal } from '@/composables/modals/useCalendarModal';
import { useTagModal } from '@/composables/modals/useTagModal';
import { cachedCalendars, getTag } from '@/services/calendarCache';
import { getEventColorCSSVariable, toColorId } from '@/colors';
import { useCalendarFilters } from '@/services/calendarFilters';

const { toggleTag, isTagVisible } = useCalendarFilters();
const calendarModal = useCalendarModal();
const tagModal = useTagModal();

function getTagId(calName: string, tagId: string): string {
  return `tag_${calName}_${tagId || 'untagged'}`;
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
      <button
        class="create-new"
        :title="$t('actions.createCalendar')"
        :aria-label="$t('actions.createCalendar')"
        @click="calendarModal.open()"
      >
        <FiPlus />
      </button>
    </div>

    <div class="calendar-list">
      <div v-for="cal in cachedCalendars" :key="cal.name" class="calendar-wrap">
        <div class="calendar">
          <span class="name">{{ cal.name }}</span>

          <button
            class="action-btn"
            :title="$t('tag.create')"
            :aria-label="$t('tag.create')"
            @click="tagModal.open(cal.name)"
          >
            <FiPlus />
          </button>

          <button class="action-btn" @click="calendarModal.open(cal.name)">
            <FiEdit2 />
          </button>
        </div>

        <div class="tags-list">
          <div class="tag" @click="toggleTag(cal.name, '')">
            <input
              type="checkbox"
              :id="getTagId(cal.name, '')"
              :name="getTagId(cal.name, '')"
              :aria-label="$t('tag.notag')"
              :checked="isTagVisible(cal.name, '')"
              @click.stop
              @change="toggleTag(cal.name, '')"
              :style="{ '--tag-color': getTagColor(cal.name) }"
            />
            <span class="tag-name">{{ $t('tag.notag') }}</span>
          </div>

          <div class="tag" v-for="tag in cal.tags" :key="tag.name" @click="toggleTag(cal.name, tag.id ?? '')">
            <input
              type="checkbox"
              :id="getTagId(cal.name, tag.id ?? '')"
              :name="getTagId(cal.name, tag.id ?? '')"
              :aria-label="tag.name"
              :checked="isTagVisible(cal.name, tag.id ?? '')"
              @click.stop
              @change="toggleTag(cal.name, tag.id ?? '')"
              :style="{ '--tag-color': getTagColor(cal.name, tag.id) }"
            />
            <span class="tag-name">{{ tag.name }}</span>

            <button class="action-btn" @click.stop="tagModal.open(cal.name, tag)">
              <FiEdit2 />
            </button>
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

  display: flex;
  flex-direction: column;
  gap: 0.6rem;
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
    padding: 0 0.25rem 0 0.4rem;

    .name {
      flex-grow: 1;
      font-weight: 600;
    }
  }
}

.calendar,
.tag {
  display: flex;
  align-items: center;
  border-radius: var(--small-border-radius);

  .action-btn:first-of-type {
    padding: 0.15rem;
  }

  &:hover .action-btn {
    opacity: 1;
    pointer-events: auto;
  }
}

.action-btn {
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

  .tag {
    height: 1.7rem;
    padding: 0 0.25rem 0 0.4rem;
    gap: 0.5rem;
    cursor: pointer;
    user-select: none;

    input[type='checkbox']:checked::before {
      background-color: var(--tag-color);
    }

    .tag-name {
      flex-grow: 1;
      font-size: 0.9em;
      opacity: 0.9;
    }

    .action-btn {
      padding: 0.15rem;
    }

    &:hover {
      background-color: var(--sidebar-hover-color);
    }

    &:active {
      transform: translateY(1px);
    }
  }
}

.tag.new {
  width: max-content;
  background-color: transparent;

  svg {
    transform: scale(1.3);
    width: 1rem;
    height: 1rem;
  }
}

@media (max-width: 768px) {
  .action-btn {
    opacity: 1;
    pointer-events: auto;
  }
}
</style>
