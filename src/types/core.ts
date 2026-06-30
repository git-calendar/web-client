import { DateTime } from 'luxon';

export interface CalendarEvent {
  id?: string;
  title: string;
  description: string;
  location: string;
  from: DateTime;
  to: DateTime;
  calendar: string;
  tagId?: string;
  parentId?: string;
  repeat?: Repetition;
}

export interface Repetition {
  frequency: Freq;
  interval: number;
  until?: DateTime;
  count?: number;
  exceptions: readonly string[];
}

export interface Calendar {
  name: string;
  tags: Tag[];
  remoteUrl: string;
  encrypted: boolean;
  readonly: boolean;
}

export interface Tag {
  id?: string;
  name: string;
  color: string;
}

// Interface showing all the methods of CalendarCore.
// The response types are all made async (Promise<T>) using Asyncify type.
export interface CalendarApi {
  createCalendar(name: string, password: string): void;
  cloneCalendar(url: string, password: string, readonly: boolean): void;
  removeCalendar(name: string): void;
  renameCalendar(oldName: string, newName: string): void;
  listCalendars(): Calendar[];
  loadCalendars(): void;
  updateRemote(calendar: string, remoteUrl: string, readonly: boolean): void;

  createEvent(event: CalendarEvent): CalendarEvent;
  updateEvent(event: CalendarEvent): CalendarEvent;
  updateRepeatingEvent(oldEvent: CalendarEvent, newEvent: CalendarEvent, strategy: UpdateStrategy): CalendarEvent;
  removeEvent(event: CalendarEvent): void;
  removeRepeatingEvent(event: CalendarEvent, strategy: UpdateStrategy): void;
  getEvent(id: string): CalendarEvent;
  getEvents(from: DateTime, to: DateTime): CalendarEvent[];

  createTag(calendar: string, tag: Tag): Tag;
  removeTag(calendar: string, id: string): void;

  setCorsProxy(url: string): void;
  syncAll(): void;
  exportZip(calendar: string): ArrayBuffer;
}

export enum Freq {
  Invalid = 0,
  Day,
  Week,
  Month,
  Year,
}

export enum UpdateStrategy {
  Current = 0,
  Following,
  All,
}
