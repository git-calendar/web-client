import type { CalendarApi } from '@/types/core';
import { hydrateDates, dehydrateDates } from '@/wasm/mapper';

// create a worker instance
const worker = new Worker(new URL('worker.ts', import.meta.url), { type: 'module' });

// create a map of pending requests to Wasm
let idCounter = 0;
const pending = new Map<number, { resolve: any; reject: any }>();

// Sends the req to worker as message and save it to pending requests.
async function call<T>(method: string, args: any[] = []): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = idCounter++;
    pending.set(id, {
      resolve: (data: any) => resolve(hydrateDates(data)),
      reject,
    });
    worker.postMessage({ id, method, args: dehydrateDates(args) });
  });
}

// Facade, which just stupidly calls the Wasm method.
function createWasmFacade<T>() {
  return new Proxy(
    {},
    {
      get(_, prop: string) {
        return (...args: any[]) => call(prop, args);
      },
    },
  ) as T;
}

// A type that makes the interface async.
type Asyncify<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => infer R ? (...args: A) => Promise<R> : T[K];
};

// create a core object which does implement the CalendarApi interface (that restrics)
// this is what Vue components import
export const CalendarCore = createWasmFacade<Asyncify<CalendarApi>>();

// on every message the worker sends back, find it in pending and resolve it (aka. call the resolve)
worker.onmessage = (e: MessageEvent) => {
  const { id, result, error } = e.data;
  const handlers = pending.get(id);
  if (!handlers) return;
  pending.delete(id);
  if (error) {
    handlers.reject(new Error(`CalendarCore call failed: ${error}`));
    if (error.startsWith('OPFS')) alert('OPFS is not available. Are you on a secure connection (HTTPS)?');
  } else handlers.resolve(result);
};
