import { DateTime } from 'luxon';

export interface CalendarEvent {
  id?: string;
  title: string;
  description?: string;
  location?: string;
  from: DateTime;
  to: DateTime;
  calendar: string;
  tag: string;
  // TODO repeat
}

// A interface showing all the methods of CalendarCore.
// The response types are all made async (Promise<T>) using Asyncify type.
export interface CalendarApi {
  createCalendar(name: string): void;
  cloneCalendar(url: string): void;
  removeCalendar(name: string): void;
  listCalendars(): string[];
  loadCalendars(): void;

  pullAll(): void;
  pushAll(): void;

  createEvent(event: CalendarEvent): CalendarEvent;
  updateEvent(event: CalendarEvent): CalendarEvent;
  removeEvent(event: CalendarEvent): void;

  getEvent(id: string): CalendarEvent;
  getEvents(from: DateTime, to: DateTime): CalendarEvent[];

  setCorsProxy(url: string): void;
}
