import { defineConfig } from 'vite';
import { resolve } from 'node:path';
export default defineConfig({
  base: './',
  build: { rollupOptions: { input: { player: resolve('index.html'), studio: resolve('studio.html') } } },
  worker: { format: 'es' },
  server: { watch: { ignored: ['**/src-tauri/**'] } }
});
