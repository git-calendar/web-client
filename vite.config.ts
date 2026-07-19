import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { compression, defineAlgorithm } from 'vite-plugin-compression2';
import { constants } from 'node:zlib';
import { VitePWA } from 'vite-plugin-pwa';
import { resolve } from 'node:path';
import { statSync } from 'node:fs';

const wasmPath = resolve(__dirname, 'src/assets/core.wasm');
const wasmDecodedSize = statSync(wasmPath).size;

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    // compress wasm files to brotli, zstd and gzip
    compression({
      include: /\.wasm$/,
      algorithms: [
        defineAlgorithm('gzip', { level: 9 }),
        defineAlgorithm('zstandard', {
          params: {
            [constants.ZSTD_c_compressionLevel]: 19,
          },
        }),
        defineAlgorithm('brotliCompress', {
          params: {
            [require('zlib').constants.BROTLI_PARAM_QUALITY]: 11,
          },
        }),
      ],
    }),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Git Calendar Web',
        short_name: 'Git Cal',
        id: '/',
        start_url: '/',
        scope: '/',
        description: 'A web client for a Git-backed calendar.',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#ffffff',
        orientation: 'portrait-primary',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
        lang: 'en',
        dir: 'ltr',
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2,wasm,zst,br,gz}'],
        maximumFileSizeToCacheInBytes: 25 * 1024 * 1024, // 25MiB (core.wasm is a big boy)
        cleanupOutdatedCaches: true,
        navigateFallback: '/index.html',
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  define: {
    __WASM_DECODED_SIZE__: JSON.stringify(wasmDecodedSize),
  },
});
