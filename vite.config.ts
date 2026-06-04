import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';

const base = process.env.GITHUB_PAGES == 'true' ? '/web-client/' : '/';

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Git Calendar Web',
        short_name: 'Git Cal',
        id: base,
        start_url: base,
        scope: base,
        description: 'A web client for a Git-backed calendar.',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#ffffff',
        orientation: 'portrait-primary',
        icons: [
          {
            src: `${base}icon-192.png`,
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: `${base}icon-512.png`,
            sizes: '512x512',
            type: 'image/png',
          },
        ],
        lang: 'en',
        dir: 'ltr',
      },

      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2,wasm}'],
        maximumFileSizeToCacheInBytes: 25 * 1024 * 1024, // 25MiB (core.wasm is a big boy)
        cleanupOutdatedCaches: true,
        navigateFallback: `${base}index.html`,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
