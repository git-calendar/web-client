import { useStorage } from '@vueuse/core';
import { watch } from 'vue';
import { CALENDAR_VIEWS, LANGUAGES, THEMES } from '@/constants.ts';
import { type HourNumbers, type WeekdayNumbers, Settings as LuxonSettings } from 'luxon';

export function useSettings() {
  return { settings };
}

export type CalendarView = (typeof CALENDAR_VIEWS)[number];

type Theme = (typeof THEMES)[number];
type HourCycle = 'h12' | 'h23';
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
    timeFormat: getBrowserHourCycle(),
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

function getBrowserHourCycle(): HourCycle {
  const formatter = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
  });
  const resolved = formatter.resolvedOptions().hourCycle;
  if (resolved === 'h11' || resolved === 'h12') {
    return 'h12';
  }
  return 'h23';
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
