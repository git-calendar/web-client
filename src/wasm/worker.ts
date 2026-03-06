/// <reference lib="webworker" />
import '@/wasm/wasm_exec.js';

declare const self: DedicatedWorkerGlobalScope;

let go: any;
let wasmReadyPromise: Promise<void> | null = null;
let opfsRootHandle: FileSystemDirectoryHandle | null = null;

async function initWasm() {
  // if we already started initializing, return the existing promise
  if (wasmReadyPromise) return wasmReadyPromise;

  // init go wasm
  wasmReadyPromise = (async () => {
    await initOPFS();

    go = new (self as any).Go();

    // create a promise that resolves when Go calls 'onWasmReady'
    const onReady = new Promise<void>((resolve) => {
      (self as any).onWasmReady = () => {
        console.log('Go Wasm is fully initialized and callbacks registered.');
        resolve();
      };
    });

    const wasmUrl = new URL('@/assets/core.wasm', import.meta.url).href;
    const response = await fetch(wasmUrl);

    if (!response.ok) {
      throw new Error(`Failed to load WASM: ${response.status}`);
    }

    const buffer = await response.arrayBuffer();
    const { instance } = await WebAssembly.instantiate(buffer, go.importObject);

    // start Go
    go.run(instance);
    await onReady;
  })();

  return wasmReadyPromise;
}

async function initOPFS() {
  if (!navigator.storage || typeof navigator.storage.getDirectory !== 'function') {
    throw new Error('OPFS not available. navigator.storage: ' + navigator.storage);
  }

  opfsRootHandle = await navigator.storage.getDirectory();
  // expose for Go
  (self as any).opfsRootHandle = opfsRootHandle;
}

self.onmessage = async (e: MessageEvent) => {
  const { id, method, args } = e.data;
  try {
    // init if not already
    await initWasm();

    // convert args to JSON strings if they are objects
    const jsonArgs = args.map((a: any) => (typeof a === 'object' ? JSON.stringify(a) : a));

    const wasmApi = (self as any).CalendarCore;
    if (!wasmApi || !wasmApi[method]) {
      throw new Error(`Method ${method} not found on CalendarCore`);
    }

    // call the Go WASM method
    let rawResult = await wasmApi[method](...jsonArgs);

    // unmarshall
    let processedResult = typeof rawResult === 'string' && rawResult !== '' ? JSON.parse(rawResult) : rawResult;

    self.postMessage({ id, result: processedResult ?? null });
  } catch (err: any) {
    self.postMessage({ id, error: err.message });
  }
};
