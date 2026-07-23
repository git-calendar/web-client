import { settings } from '@/services/settings';

export const colorsList = [
  'blue',
  'green',
  'red',
  'purple',
  'yellow',
  'orange',
  'pink',
  'teal',
  'brown',
  'gray',
] as const;

export type ColorId = (typeof colorsList)[number];

// Just returns the CSS variable name
export function getEventColorCSSVariable(colorId: ColorId): string {
  return `var(--event-color-${colorId})`;
}

export function getColorI18nKey(id: ColorId): string {
  return `colors.${id}`;
}

export function toColorId(color?: string): ColorId {
  if (colorsList.includes(color as ColorId)) return color as ColorId;
  else return settings.value.defaultEventColor;
}
