import { useStorage } from '@vueuse/core';
import { watch } from 'vue';
import { LANGUAGES } from '@/constants.ts';
import { type HourNumbers, type WeekdayNumbers, Settings as LuxonSettings } from 'luxon';

export function useSettings() {
  return { settings };
}

export const calendarViewValues = ['4days', 'week', 'month'] as const;
export type CalendarView = (typeof calendarViewValues)[number];

type Theme = 'auto' | 'light' | 'dark';
type HourCycle = 'h11' | 'h23';
type Lang = (typeof LANGUAGES)[number]['code'];

type UserSettings = {
  theme: Theme;
  language: Lang;
  timeFormat: HourCycle; // maybe use Intl.LocaleHourCycleKey as type
  weekStart: WeekdayNumbers;
  defaultView: CalendarView;
  dayViewStartHour: HourNumbers;
  dayViewEndHour: HourNumbers;
  dragPrecisionMinutes: number;
  corsProxyURL: string;
};

// default settings
const settings = useStorage<UserSettings>(
  'user-settings',
  {
    theme: 'auto',
    language: 'en',
    timeFormat: 'h23',
    weekStart: 1, // monday
    defaultView: 'week',
    dayViewStartHour: 6,
    dayViewEndHour: 0,
    dragPrecisionMinutes: 30,
    corsProxyURL: '',
  },
  localStorage,
  { mergeDefaults: true },
);

watch(
  () => settings.value.language,
  (newLang) => {
    LuxonSettings.defaultLocale = newLang;
  },
);
LuxonSettings.defaultLocale = settings.value.language;

// -------------------------- theme --------------------------
function getSystemThemePreference() {
  const name = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  return name!;
}

// auto html tag update
function applyTheme(theme: Theme) {
  if (theme === 'auto') document.documentElement.setAttribute('data-theme', getSystemThemePreference());
  else document.documentElement.setAttribute('data-theme', theme);
}

// run right after load
applyTheme(settings.value.theme);
// watch for changes and apply automatically
watch(
  () => settings.value.theme,
  (newTheme) => applyTheme(newTheme),
);
