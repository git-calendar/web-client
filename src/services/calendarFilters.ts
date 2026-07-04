import { computed, reactive } from 'vue';
import { cachedCalendars } from '@/services/calendarCache';

export type GetEventsFilter = Record<string, string[]>;

const hiddenCalendars = reactive(new Set<string>());
const hiddenTags = reactive(new Set<string>());

function tagKey(calendar: string, tagId: string): string {
  return `${calendar}:${tagId}`;
}

export function useCalendarFilters() {
  const filter = computed<GetEventsFilter | null>(() => {
    if (hiddenCalendars.size === 0 && hiddenTags.size === 0) {
      return null;
    }

    const out: GetEventsFilter = {};

    for (const cal of cachedCalendars.value) {
      if (hiddenCalendars.has(cal.name)) {
        continue;
      }

      const tagIds = cal.tags.flatMap((tag) => {
        if (!tag.id || hiddenTags.has(tagKey(cal.name, tag.id))) {
          return [];
        }

        return [tag.id];
      });

      if (tagIds.length > 0) {
        out[cal.name] = tagIds;
      }
    }

    return out;
  });

  function toggleCalendar(calendar: string) {
    if (hiddenCalendars.has(calendar)) {
      hiddenCalendars.delete(calendar);
      return;
    }

    hiddenCalendars.add(calendar);
  }

  function toggleTag(calendar: string, tagId: string) {
    const key = tagKey(calendar, tagId);

    if (hiddenTags.has(key)) {
      hiddenTags.delete(key);
      return;
    }

    hiddenTags.add(key);
  }

  function isCalendarVisible(calendar: string): boolean {
    return !hiddenCalendars.has(calendar);
  }

  function isTagVisible(calendar: string, tagId?: string): boolean {
    if (!tagId) {
      return false;
    }

    return !hiddenTags.has(tagKey(calendar, tagId));
  }

  return {
    filter,
    toggleCalendar,
    toggleTag,
    isCalendarVisible,
    isTagVisible,
  };
}
