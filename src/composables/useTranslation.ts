// https://vue-i18n.intlify.dev/

import { watch } from 'vue';
import { createI18n } from 'vue-i18n';
import type { LANGUAGES } from '@/constants.ts';
import { DateTime } from 'luxon';
import { settings } from '@/services/settings';

type LocaleCode = (typeof LANGUAGES)[number]['code'];
type MessageSchema = typeof import('@/assets/locales/en.json'); // type-define 'en' as the master schema for the resource

const localeModules = import.meta.glob('@/assets/locales/*.json', { eager: true });
const messages = {} as Record<LocaleCode, MessageSchema>;
for (const path in localeModules) {
  const match = path.match(/\/([a-z]+)\.json$/); // extract 'en', 'cs', etc.
  if (!match) continue;
  const code = match[1] as LocaleCode;
  messages[code] = (localeModules[path] as any).default; // cast JSON to correct schema
}

const i18n = createI18n<[MessageSchema], LocaleCode>({
  legacy: false,
  locale: settings.value.language,
  fallbackLocale: 'en',
  messages,
});

watch(
  () => settings.value.language,
  (newLang) => {
    (i18n.global.locale as any).value = newLang; // WHY TYPESCRIPT WHY
  },
);

function dayNameSuperShort(date: DateTime): string {
  let str = date.toLocaleString({ weekday: 'narrow' });
  str = str.charAt(0).toUpperCase() + str.slice(1); // make it uppercase every time
  return str;
}

function dayNameShort(date: DateTime): string {
  let str = date.toLocaleString({ weekday: 'short' });
  str = str.charAt(0).toUpperCase() + str.slice(1); // make it uppercase every time
  return str;
}

function dayNameLong(date: DateTime): string {
  let str = date.toLocaleString({ weekday: 'long' });
  str = str.charAt(0).toUpperCase() + str.slice(1); // make it uppercase every time
  return str;
}

function monthName(date: DateTime): string {
  let str = date.toLocaleString({ month: 'short' });
  str = str.charAt(0).toUpperCase() + str.slice(1); // make it uppercase every time
  return str;
}

function monthNameLong(date: DateTime): string {
  let str = date.toLocaleString({ month: 'long' });
  str = str.charAt(0).toUpperCase() + str.slice(1); // make it uppercase every time
  return str;
}

export function useTranslation() {
  return { i18n, dayNameSuperShort, dayNameLong, dayNameShort, monthName, monthNameLong };
}
