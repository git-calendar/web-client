import type { CalendarApi } from '@/types/core';
import type { CoreErrorCode } from '@/types/errors';
import { hydrateDates, dehydrateDates } from '@/wasm/mapper';
import { reactive } from 'vue';

export const CoreLoadingState = reactive({
  percentage: 0,
  textId: 'loading',
  other: '',
});
const worker = new Worker(new URL('worker.ts', import.meta.url), { type: 'module' });

class CalendarCoreError extends Error {
  constructor(
    message: string,
    readonly code?: CoreErrorCode,
    readonly calendar?: string,
  ) {
    super(message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Readiness Gate
// ─────────────────────────────────────────────────────────────────────────────

let resolveReady!: () => void;
let rejectReady!: (err: Error) => void;

const readyPromise = new Promise<void>((resolve, reject) => {
  resolveReady = resolve;
  rejectReady = reject;
});

// ─────────────────────────────────────────────────────────────────────────────
// RPC State & Dispatch
// ─────────────────────────────────────────────────────────────────────────────

let idCounter = 0;
type PendingCall = { resolve: (v: any) => void; reject: (e: Error) => void };
const pending = new Map<number, PendingCall>();

async function call<T>(method: string, args: any[] = []): Promise<T> {
  // Block until WASM is fully initialized
  await readyPromise;

  return new Promise<T>((resolve, reject) => {
    const id = idCounter++;
    pending.set(id, {
      resolve: (data) => resolve(hydrateDates(data)),
      reject,
    });
    worker.postMessage({ id, method, args: dehydrateDates(args) });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Worker Event Handlers
// ─────────────────────────────────────────────────────────────────────────────

worker.onmessage = ({ data }: MessageEvent) => {
  if (data.type === 'progress') {
    CoreLoadingState.percentage = data.percentage;
    CoreLoadingState.textId = data.textId;
    CoreLoadingState.other = data.other;
    // Worker signals 100% exactly once when onWasmReady fires
    if (data.percentage === 100) resolveReady();
    return;
  }

  const { id, result, error, code, calendar } = data;
  const handlers = pending.get(id);

  if (!handlers) return;
  pending.delete(id);

  if (error) {
    handlers.reject(new CalendarCoreError(error, code, calendar));
  } else {
    handlers.resolve(result);
  }
};

worker.onerror = (e) => {
  console.error('CalendarCore worker crashed:', e);

  // Reject the init promise if it hasn't resolved yet
  rejectReady(new Error('Worker initialization failed'));

  // Flush and reject any calls that were waiting for a response
  for (const [id, { reject }] of pending) {
    reject(new Error('Worker crashed while processing request'));
    pending.delete(id);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Facade
// ─────────────────────────────────────────────────────────────────────────────

// Forces all methods on the API to return Promises
type Asyncify<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => infer R ? (...args: A) => Promise<Awaited<R>> : T[K];
};

export const CalendarCore = new Proxy({} as Asyncify<CalendarApi>, {
  get:
    (_, method: string) =>
    (...args: any[]) =>
      call(method, args),
});
