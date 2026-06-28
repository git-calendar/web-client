export type ColorId =
  | 'blue'
  | 'green'
  | 'red'
  | 'purple'
  | 'yellow'
  | 'orange'
  | 'cyan'
  | 'teal'
  | 'pink'
  | 'indigo'
  | 'berry'
  | 'slate';

export interface ColorDefinition {
  id: ColorId;
  hex: string;
  i18nKey: string;
}

export const COLORS: Record<ColorId, ColorDefinition> = {
  blue: { id: 'blue', hex: '#6495ED', i18nKey: 'colors.blue' },
  green: { id: 'green', hex: '#2EA043', i18nKey: 'colors.green' },
  red: { id: 'red', hex: '#D73A49', i18nKey: 'colors.red' },
  purple: { id: 'purple', hex: '#8250DF', i18nKey: 'colors.purple' },
  yellow: { id: 'yellow', hex: '#D9A520', i18nKey: 'colors.yellow' },
  orange: { id: 'orange', hex: '#F66A0A', i18nKey: 'colors.orange' },
  cyan: { id: 'cyan', hex: '#00ACC1', i18nKey: 'colors.cyan' },
  teal: { id: 'teal', hex: '#009688', i18nKey: 'colors.teal' },
  pink: { id: 'pink', hex: '#E84393', i18nKey: 'colors.pink' },
  indigo: { id: 'indigo', hex: '#5C6BC0', i18nKey: 'colors.indigo' },
  berry: { id: 'berry', hex: '#9D4EDD', i18nKey: 'colors.berry' },
  slate: { id: 'slate', hex: '#607D8B', i18nKey: 'colors.slate' },
};

export const colorsList = Object.values(COLORS);
