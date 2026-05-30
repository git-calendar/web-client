import { GoWasm } from '../go-wasm/go-wasm';
import type { CalendarEvent } from '../types/core';
import { luxonReviver } from './reviver';
import { DateTime } from 'luxon';

import workerUrl from '../go-wasm/worker.js?url';

export class CalendarCoreService {
  private wasm!: GoWasm;

  async init() {
    this.wasm = await GoWasm.init(workerUrl);
  }

  async loadCalendars(): Promise<void> {
    await this.wasm.loadCalendars();
  }

  async listCalendars(): Promise<string[]> {
    const rawJson = await this.wasm.listCalendars();
    return JSON.parse(rawJson) as string[];
  }

  async getEvents(from: DateTime, to: DateTime): Promise<CalendarEvent[]> {
    const rawJson = await this.wasm.getEvents(from.toISO()!, to.toISO()!);
    return JSON.parse(rawJson, luxonReviver) as CalendarEvent[];
  }
}

export const CalendarCore = new CalendarCoreService();
