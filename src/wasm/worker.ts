/// <reference lib="webworker" />
import '@/wasm/wasm_exec.js';

// Disclamer: I wibe-coded this shit. Who the hell would enjoy writing something like this.

// ─────────────────────────────────────────────────────────────────────────────
// Types & Globals
// ─────────────────────────────────────────────────────────────────────────────

interface GoRuntime {
  importObject: WebAssembly.Imports;
  run(instance: WebAssembly.Instance): void;
}

interface CalendarCoreApi {
  [method: string]: (...args: unknown[]) => unknown | Promise<unknown>;
}

// Extend the worker scope to banish `(self as any)` forever
declare global {
  interface DedicatedWorkerGlobalScope {
    Go: new () => GoRuntime;
    opfsRootHandle: FileSystemDirectoryHandle;
    onWasmReady: () => void;
    CalendarCore?: CalendarCoreApi;
  }
}

declare const self: DedicatedWorkerGlobalScope;

type WorkerOutbound =
  | { type: 'progress'; percentage: number; textId: string; other: string }
  | { type: 'result'; id: number; result: unknown }
  | { type: 'error'; id: number; error: string };

interface RpcRequest {
  id: number;
  method: string;
  args: unknown[];
}

const MB = 1_048_576;
let wasmReadyPromise: Promise<void> | null = null;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function post(msg: WorkerOutbound) {
  self.postMessage(msg);
}
function progress(percentage: number, text_id: string, other: string = '') {
  post({ type: 'progress', percentage, textId: text_id, other });
}

// ─────────────────────────────────────────────────────────────────────────────
// WASM Fetching & OPFS
// ─────────────────────────────────────────────────────────────────────────────

async function fetchWasm(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`WASM fetch failed: HTTP ${response.status} or missing body`);
  }

  const contentLength = response.headers.get('Content-Length');
  const encoding = response.headers.get('Content-Encoding');
  const total = contentLength ? parseInt(contentLength, 10) : 1;
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    chunks.push(value);
    received += value.byteLength;
    const encodedRecieved = received / (encoding == 'gzip' ? 4 : 1); // account for ~4x compression with Gzip

    const pct = total ? 5 + Math.round((encodedRecieved / total) * 85) : 50;
    const sizeMsg = total
      ? `${(encodedRecieved / MB).toFixed(1)} / ${(total / MB).toFixed(1)} MB`
      : `${(encodedRecieved / MB).toFixed(1)} MB`;

    progress(Math.min(pct, 90), `fetchingWasm`, sizeMsg);
  }

  // Merge chunks
  const merged = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return merged.buffer;
}

// ─────────────────────────────────────────────────────────────────────────────
// Initialization
// ─────────────────────────────────────────────────────────────────────────────

async function setupWasm(): Promise<void> {
  progress(0, 'storage');
  if (!navigator.storage?.getDirectory) {
    throw new Error('OPFS is not available in this context.');
  }
  self.opfsRootHandle = await navigator.storage.getDirectory();

  const go = new self.Go();
  const onReady = new Promise<void>((resolve) => {
    self.onWasmReady = () => {
      console.log('Go Wasm initialized.');
      resolve();
    };
  });

  progress(5, 'fetchingWasm');
  const wasmUrl = new URL('@/assets/core.wasm', import.meta.url).href;
  const buffer = await fetchWasm(wasmUrl);

  progress(90, 'compiling');
  const { instance } = await WebAssembly.instantiate(buffer, go.importObject);

  progress(95, 'starting');
  go.run(instance);

  await onReady;
  progress(100, 'done');
}

function initWasm(): Promise<void> {
  if (!wasmReadyPromise) {
    wasmReadyPromise = setupWasm().catch((err) => {
      wasmReadyPromise = null; // Reset so callers can retry
      throw err;
    });
  }
  return wasmReadyPromise;
}

// ─────────────────────────────────────────────────────────────────────────────
// RPC Dispatch
// ─────────────────────────────────────────────────────────────────────────────

async function dispatch({ id, method, args }: RpcRequest): Promise<void> {
  try {
    await initWasm();

    const api = self.CalendarCore;
    if (!api || typeof api[method] !== 'function') {
      throw new Error(`Method "${method}" not found on CalendarCore`);
    }

    // Serialize object args to JSON for Go
    const serializedArgs = args.map((arg) => (typeof arg === 'object' && arg !== null ? JSON.stringify(arg) : arg));

    const raw = await api[method](...serializedArgs);

    // Attempt to deserialize result if it's a JSON string
    let result = raw ?? null;
    if (typeof raw === 'string' && raw.length > 0) {
      try {
        result = JSON.parse(raw);
      } catch {
        /* keep as plain string */
      }
    }

    post({ type: 'result', id, result });
  } catch (err: unknown) {
    post({ type: 'error', id, error: err instanceof Error ? err.message : String(err) });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Entry point
// ─────────────────────────────────────────────────────────────────────────────

void initWasm();

self.onmessage = (e: MessageEvent<RpcRequest>) => {
  void dispatch(e.data);
};
