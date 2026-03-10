import type { CalendarEvent } from '@/types/core';
import { type InjectionKey } from 'vue';

type showEventModalFunction = (event?: CalendarEvent) => void;
export const openEventModalKey: InjectionKey<showEventModalFunction> = Symbol('openEventModal');

type showCalendarModalFunction = () => void;
export const openCalendarModalKey: InjectionKey<showCalendarModalFunction> = Symbol('openCalendarModal');
