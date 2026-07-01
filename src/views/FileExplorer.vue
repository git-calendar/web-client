<script setup lang="ts">
// VIBE-CODED!!!!

import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch, type Ref, type ShallowRef } from 'vue';

const DATABASE_NAME: string = 'git-calendar-data';
const INFO_STORE: string = 'info';
const CONTENT_STORE: string = 'content';
const PREVIEW_LIMIT: number = 2 * 1024 * 1024;
const ITEM_HEIGHT: number = 30; // must match CSS .tree-row { height: 30px }
const OVERSCAN: number = 5;

interface Metadata {
  name?: unknown;
  size?: unknown;
  mode?: unknown;
}

interface FileEntry {
  path: string;
  name: string;
  size: number | null;
  directory: boolean;
}

interface TreeNode {
  path: string;
  name: string;
  size: number | null;
  directory: boolean;
  entry: FileEntry | null;
  children: TreeNode[];
}

interface VisibleTreeNode extends TreeNode {
  depth: number;
}

interface VirtualSlice {
  nodes: VisibleTreeNode[];
  offsetY: number;
  totalHeight: number;
}

type PreviewState = 'idle' | 'loading' | 'empty' | 'text' | 'binary' | 'error';

// shallowRef: these are always replaced wholesale, never mutated in place,
// so deep reactivity tracking is wasted work.
const tree: ShallowRef<TreeNode[]> = shallowRef<TreeNode[]>([]);
const expanded: ShallowRef<Set<string>> = shallowRef<Set<string>>(new Set<string>());
const selectedFile: ShallowRef<FileEntry | null> = shallowRef<FileEntry | null>(null);

const preview: Ref<string> = ref<string>('');
const previewError: Ref<string> = ref<string>('');
const previewState: Ref<PreviewState> = ref<PreviewState>('idle');
const loading: Ref<boolean> = ref<boolean>(false);
const error: Ref<string> = ref<string>('');

// Virtual scroll state
const treeRef = ref<HTMLElement | null>(null);
const treeScrollTop = ref<number>(0);
const treeClientHeight = ref<number>(600); // reasonable default before ResizeObserver fires

const visibleNodes = computed<VisibleTreeNode[]>(function getVisibleNodes(): VisibleTreeNode[] {
  const result: VisibleTreeNode[] = [];
  appendVisibleNodes(tree.value, 0, result);
  return result;
});

// Only render the rows actually on screen plus an overscan buffer above/below.
const virtualSlice = computed<VirtualSlice>(function getVirtualSlice(): VirtualSlice {
  const nodes = visibleNodes.value;
  const total = nodes.length;
  const start = Math.max(0, Math.floor(treeScrollTop.value / ITEM_HEIGHT) - OVERSCAN);
  const end = Math.min(total, Math.ceil((treeScrollTop.value + treeClientHeight.value) / ITEM_HEIGHT) + OVERSCAN);
  return {
    nodes: nodes.slice(start, end),
    offsetY: start * ITEM_HEIGHT,
    totalHeight: total * ITEM_HEIGHT,
  };
});

// Track the tree panel's height so virtual scroll knows the viewport size.
watch(
  treeRef,
  function watchTree(el: HTMLElement | null, _prev: HTMLElement | null, onCleanup: (fn: () => void) => void): void {
    if (el === null) return;
    treeClientHeight.value = el.clientHeight;
    const observer = new ResizeObserver(function onResize(entries: ResizeObserverEntry[]): void {
      treeClientHeight.value = entries[0]?.contentRect.height ?? el.clientHeight;
    });
    observer.observe(el);
    onCleanup(function cleanup(): void {
      observer.disconnect();
    });
  },
);

let database: IDBDatabase | null = null;
let previewRequest: number = 0;

onMounted(loadDatabase);
onBeforeUnmount(closeDatabase);

function handleTreeScroll(event: Event): void {
  treeScrollTop.value = (event.target as HTMLElement).scrollTop;
}

async function loadDatabase(): Promise<void> {
  loading.value = true;
  error.value = '';
  tree.value = [];
  expanded.value = new Set<string>();
  clearPreview();
  closeDatabase();

  try {
    const openedDatabase: IDBDatabase = await requestResult<IDBDatabase>(indexedDB.open(DATABASE_NAME));

    validateStores(openedDatabase);
    database = openedDatabase;

    const entries: FileEntry[] = await readFiles(openedDatabase);
    const nextTree: TreeNode[] = buildTree(entries);

    tree.value = nextTree;
    expanded.value = new Set<string>(
      nextTree
        .filter(function isDirectoryNode(node: TreeNode): boolean {
          return node.directory;
        })
        .map(function getPath(node: TreeNode): string {
          return node.path;
        }),
    );
  } catch (cause: unknown) {
    closeDatabase();
    error.value = getErrorMessage(cause);
  } finally {
    loading.value = false;
  }
}

function validateStores(currentDatabase: IDBDatabase): void {
  if (!currentDatabase.objectStoreNames.contains(INFO_STORE)) {
    currentDatabase.close();
    throw new Error(`Missing IndexedDB store "${INFO_STORE}".`);
  }

  if (!currentDatabase.objectStoreNames.contains(CONTENT_STORE)) {
    currentDatabase.close();
    throw new Error(`Missing IndexedDB store "${CONTENT_STORE}".`);
  }
}

async function readFiles(currentDatabase: IDBDatabase): Promise<FileEntry[]> {
  const transaction: IDBTransaction = currentDatabase.transaction(INFO_STORE, 'readonly');
  const store: IDBObjectStore = transaction.objectStore(INFO_STORE);
  const keysPromise: Promise<IDBValidKey[]> = requestResult<IDBValidKey[]>(store.getAllKeys());
  const valuesPromise: Promise<unknown[]> = requestResult<unknown[]>(store.getAll());
  const keys: IDBValidKey[] = await keysPromise;
  const values: unknown[] = await valuesPromise;
  const result: FileEntry[] = [];

  for (let index: number = 0; index < keys.length; index += 1) {
    const key: IDBValidKey | undefined = keys[index];

    if (typeof key === 'string') {
      result.push(createFileEntry(key, values[index]));
    }
  }

  return result;
}

function createFileEntry(path: string, value: unknown): FileEntry {
  const metadata: Metadata = parseMetadata(value);
  const mode: number | null = readNumber(metadata.mode);

  return {
    path,
    name: readString(metadata.name) ?? getFileName(path),
    size: readNumber(metadata.size),
    directory: isDirectory(mode) || /[\\/]$/.test(path),
  };
}

function buildTree(entries: FileEntry[]): TreeNode[] {
  const roots: TreeNode[] = [];
  const nodes: Map<string, TreeNode> = new Map<string, TreeNode>();

  for (const entry of entries) {
    const parts: string[] = normalizePath(entry.path).split('/').filter(Boolean);

    if (parts.length === 0) {
      continue;
    }

    let children: TreeNode[] = roots;
    let currentPath: string = '';

    for (let index: number = 0; index < parts.length; index += 1) {
      const part: string = parts[index] ?? '';
      const last: boolean = index === parts.length - 1;
      currentPath = currentPath === '' ? part : `${currentPath}/${part}`;

      let node: TreeNode | undefined = nodes.get(currentPath);

      if (node === undefined) {
        node = {
          path: currentPath,
          name: last ? entry.name : part,
          size: last ? entry.size : null,
          directory: !last || entry.directory,
          entry: last && !entry.directory ? entry : null,
          children: [],
        };

        nodes.set(currentPath, node);
        children.push(node);
      } else if (last) {
        node.name = entry.name;
        node.size = entry.size;
        node.directory = entry.directory;
        node.entry = entry.directory ? null : entry;
      }

      children = node.children;
    }
  }

  finalizeTree(roots);
  return roots;
}

function finalizeTree(nodes: TreeNode[]): void {
  for (const node of nodes) {
    finalizeTree(node.children);

    if (node.children.length > 0) {
      node.directory = true;
      node.entry = null;
      node.size = null;
    }
  }

  nodes.sort(compareTreeNodes);
}

function compareTreeNodes(left: TreeNode, right: TreeNode): number {
  if (left.directory !== right.directory) {
    return left.directory ? -1 : 1;
  }

  return left.name.localeCompare(right.name, undefined, { numeric: true });
}

function appendVisibleNodes(nodes: TreeNode[], depth: number, result: VisibleTreeNode[]): void {
  for (const node of nodes) {
    result.push({ ...node, depth });

    if (node.directory && expanded.value.has(node.path)) {
      appendVisibleNodes(node.children, depth + 1, result);
    }
  }
}

function activateNode(node: VisibleTreeNode): void {
  if (node.directory) {
    toggleDirectory(node.path);
    return;
  }

  if (node.entry !== null) {
    openFile(node.entry);
  }
}

function toggleDirectory(path: string): void {
  const nextExpanded: Set<string> = new Set<string>(expanded.value);

  if (nextExpanded.has(path)) {
    nextExpanded.delete(path);
  } else {
    nextExpanded.add(path);
  }

  expanded.value = nextExpanded;
}

function isExpanded(path: string): boolean {
  return expanded.value.has(path);
}

function openFile(file: FileEntry): void {
  selectedFile.value = file;
  void loadPreview(file);
}

async function loadPreview(file: FileEntry): Promise<void> {
  const currentDatabase: IDBDatabase | null = database;
  const requestID: number = ++previewRequest;

  preview.value = '';
  previewError.value = '';
  previewState.value = 'loading';

  if (currentDatabase === null) {
    previewState.value = 'error';
    previewError.value = 'Database is not open.';
    return;
  }

  try {
    const transaction: IDBTransaction = currentDatabase.transaction(CONTENT_STORE, 'readonly');
    const store: IDBObjectStore = transaction.objectStore(CONTENT_STORE);
    const storedValue: unknown = await requestResult<unknown>(store.get(file.path));
    const bytes: Uint8Array = await readBytes(storedValue);

    if (requestID !== previewRequest) {
      return;
    }

    if (bytes.byteLength === 0) {
      previewState.value = 'empty';
      return;
    }

    if (isBinary(bytes)) {
      previewState.value = 'binary';
      return;
    }

    preview.value = decodePreview(file.path, bytes);
    previewState.value = 'text';
  } catch (cause: unknown) {
    if (requestID !== previewRequest) {
      return;
    }

    previewState.value = 'error';
    previewError.value = getErrorMessage(cause);
  }
}

async function readBytes(value: unknown): Promise<Uint8Array> {
  if (value === undefined || value === null) {
    return new Uint8Array();
  }

  if (value instanceof Uint8Array) {
    return value;
  }

  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value);
  }

  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }

  if (value instanceof Blob) {
    return new Uint8Array(await value.arrayBuffer());
  }

  throw new Error('Unsupported file content type.');
}

function isBinary(bytes: Uint8Array): boolean {
  const sample: Uint8Array = bytes.subarray(0, 16 * 1024);
  let controlBytes: number = 0;

  for (const byte of sample) {
    if (byte === 0) {
      return true;
    }

    if (byte < 32 && byte !== 9 && byte !== 10 && byte !== 13) {
      controlBytes += 1;
    }
  }

  return controlBytes / sample.byteLength > 0.02;
}

function decodePreview(path: string, bytes: Uint8Array): string {
  const visibleBytes: Uint8Array = bytes.subarray(0, PREVIEW_LIMIT);
  const text: string = new TextDecoder().decode(visibleBytes);
  const complete: boolean = visibleBytes.byteLength === bytes.byteLength;

  if (complete && path.toLowerCase().endsWith('.json')) {
    try {
      const value: unknown = JSON.parse(text) as unknown;
      return JSON.stringify(value, null, 2) ?? text;
    } catch {
      return text;
    }
  }

  return complete ? text : `${text}\n\n… preview truncated …`;
}

function parseMetadata(value: unknown): Metadata {
  if (typeof value === 'string') {
    try {
      return parseMetadata(JSON.parse(value) as unknown);
    } catch {
      return {};
    }
  }

  if (!isRecord(value)) {
    return {};
  }

  return {
    name: value.name,
    size: value.size,
    mode: value.mode,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
}

function getFileName(path: string): string {
  const parts: string[] = normalizePath(path).split('/');
  return parts[parts.length - 1] ?? path;
}

function isDirectory(mode: number | null): boolean {
  if (mode === null) {
    return false;
  }

  const unsignedMode: number = mode >>> 0;
  return (unsignedMode & 0x80000000) !== 0 || (unsignedMode & 0o170000) === 0o040000;
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>(function createPromise(resolve, reject): void {
    request.onsuccess = handleSuccess;
    request.onerror = handleError;

    function handleSuccess(): void {
      resolve(request.result);
    }

    function handleError(): void {
      reject(request.error ?? new Error('IndexedDB request failed.'));
    }
  });
}

function clearPreview(): void {
  previewRequest += 1;
  selectedFile.value = null;
  preview.value = '';
  previewError.value = '';
  previewState.value = 'idle';
}

function closeDatabase(): void {
  database?.close();
  database = null;
}

function formatBytes(bytes: number | null): string {
  if (bytes === null) {
    return '';
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  return `${(bytes / 1024).toFixed(1)} KiB`;
}

function getErrorMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}
</script>

<template>
  <main class="explorer" :aria-busy="loading">
    <header class="toolbar">
      <div>
        <strong>IndexedDB files</strong>
        <span>{{ DATABASE_NAME }}</span>
      </div>

      <button type="button" :disabled="loading" @click="loadDatabase">
        {{ loading ? 'Loading…' : 'Reload' }}
      </button>
    </header>

    <p v-if="error" class="status error" role="alert">{{ error }}</p>

    <div v-else class="panes">
      <!--
        ref + @scroll.passive: track scroll position for virtual windowing.
        .passive tells the browser it can scroll immediately without waiting
        for the handler to return, which removes jank from scroll events.
      -->
      <aside class="tree" aria-label="File tree" ref="treeRef" @scroll.passive="handleTreeScroll">
        <p v-if="loading" class="status">Loading files…</p>
        <p v-else-if="tree.length === 0" class="status">No files found.</p>

        <!--
          Virtual scroll: the outer div is a full-height spacer that creates
          the correct scrollable area. The inner div translates to the start
          of the visible window and only contains the rendered rows.
        -->
        <div v-else role="tree" class="tree-virtual" :style="{ height: `${virtualSlice.totalHeight}px` }">
          <div class="tree-viewport" :style="{ transform: `translateY(${virtualSlice.offsetY}px)` }">
            <button
              v-for="node in virtualSlice.nodes"
              :key="node.path"
              type="button"
              role="treeitem"
              class="tree-row"
              :class="{
                selected: node.entry !== null && selectedFile !== null && node.entry.path === selectedFile.path,
              }"
              :style="{ paddingLeft: `${10 + node.depth * 18}px` }"
              :aria-level="node.depth + 1"
              :aria-expanded="node.directory ? isExpanded(node.path) : undefined"
              :aria-selected="node.entry !== null && selectedFile !== null && node.entry.path === selectedFile.path"
              :title="node.path"
              @click="activateNode(node)"
            >
              <span class="caret" aria-hidden="true">
                {{ node.directory ? (isExpanded(node.path) ? '▾' : '▸') : '' }}
              </span>
              <span aria-hidden="true">{{ node.directory ? '📁' : '📄' }}</span>
              <span class="name">{{ node.name }}</span>
              <span v-if="!node.directory" class="size">{{ formatBytes(node.size) }}</span>
            </button>
          </div>
        </div>
      </aside>

      <section class="preview" aria-labelledby="preview-title">
        <header class="preview-header">
          <h2 id="preview-title">{{ selectedFile?.name ?? 'Preview' }}</h2>
          <code v-if="selectedFile !== null" :title="selectedFile.path">{{ selectedFile.path }}</code>
        </header>

        <div class="preview-body">
          <p v-if="selectedFile === null" class="status">Select a file from the tree.</p>
          <p v-else-if="previewState === 'loading'" class="status">Loading preview…</p>
          <p v-else-if="previewState === 'empty'" class="status">Empty file.</p>
          <p v-else-if="previewState === 'binary'" class="status">Binary file. Preview skipped.</p>
          <p v-else-if="previewState === 'error'" class="status error" role="alert">{{ previewError }}</p>
          <pre v-else-if="previewState === 'text'">{{ preview }}</pre>
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
.explorer,
.explorer * {
  box-sizing: border-box;
}

.explorer {
  display: flex;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  flex-direction: column;
  color: var(--text-color);
  background: var(--bg-color);
  font:
    14px/1.4 system-ui,
    sans-serif;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: var(--sidebar-color);
  border-bottom: 1px solid var(--grid-color);
}

.toolbar div {
  min-width: 0;
}

.toolbar strong,
.toolbar span,
.preview-header code {
  display: block;
}

.toolbar strong,
.preview-header h2,
pre {
  color: var(--text-color-hard);
}

.toolbar span,
.preview-header code,
.size,
.status {
  color: var(--text-color);
}

.toolbar span,
.preview-header code,
.size {
  font-size: 12px;
}

button {
  color: inherit;
  font: inherit;
}

.toolbar button {
  margin-left: auto;
  padding: 5px 10px;
  background: var(--btn-bg-color);
  border: 1px solid var(--grid-color);
  border-radius: var(--small-border-radius);
  cursor: pointer;
}

.toolbar button:hover:not(:disabled) {
  background: var(--btn-bg-color-hover);
}

button:disabled {
  cursor: default;
  opacity: 0.6;
}

button:focus-visible {
  outline: 1px solid var(--git-color);
  outline-offset: -1px;
}

.panes {
  display: flex;
  min-height: 0;
  flex: 1;
}

.tree {
  overflow: auto;
  flex: 0 0 30rem;
  padding: 6px 0;
  background: var(--sidebar-color);
  border-right: 1px solid var(--grid-color);
  /*
    contain: content tells the browser that nothing inside this element
    affects layout outside it. During resize, the browser can skip
    propagating layout recalculations up through the flex tree.
  */
  contain: content;
}

/* Virtual scroll spacer — creates the full scrollable height */
.tree-virtual {
  position: relative;
}

/* Virtual scroll window — holds only the rendered rows, shifted by translateY */
.tree-viewport {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
}

.tree-row {
  display: flex;
  width: 100%;
  height: 30px;
  align-items: center;
  gap: 6px;
  padding-right: 8px;
  overflow: hidden;
  color: var(--text-color);
  background: transparent;
  border: 0;
  cursor: pointer;
  text-align: left;
}

.tree-row:hover {
  background: var(--sidebar-hover-color);
}

.tree-row.selected {
  color: var(--text-color-hard);
  background: var(--btn-bg-color-checked);
}

.caret {
  width: 12px;
  flex: 0 0 12px;
  text-align: center;
}

.name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.size {
  margin-left: auto;
  white-space: nowrap;
}

.preview {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  background: var(--bg-color);
}

.preview-header {
  min-width: 0;
  padding: 10px 12px;
  border-bottom: 1px solid var(--grid-color);
}

.preview-header h2 {
  margin: 0;
  font-size: 14px;
}

.preview-header code {
  overflow: hidden;
  margin-top: 2px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview-body {
  min-height: 0;
  overflow: auto;
  flex: 1;
  padding: 12px;
  /*
    Same as .tree: contain: content prevents the pre's min-width: max-content
    from triggering a full-page layout recalculation on every resize frame.
    This is the primary fix for resize lag.
  */
  contain: content;
}

pre {
  min-width: max-content;
  margin: 0;
  font:
    13px/1.5 ui-monospace,
    SFMono-Regular,
    Consolas,
    monospace;
  white-space: pre;
}

.status {
  margin: 0;
  padding: 12px;
}

.preview-body > .status {
  padding: 0;
}

.error {
  color: var(--git-color);
}
</style>
