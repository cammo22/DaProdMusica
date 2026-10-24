import { defineConfig } from 'vite';
import { resolve } from 'node:path';
export default defineConfig(({mode})=>({
  base: './',
  build: { rollupOptions: { input: mode==='player'?{player:resolve('index.html')}:{ player: resolve('index.html'), studio: resolve('studio.html') } } },
  worker: { format: 'es' },
  server: { watch: { ignored: ['**/src-tauri/**'] } }
}));
