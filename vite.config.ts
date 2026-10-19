import { copyFileSync } from 'node:fs';
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

const base = process.env.BASE_PATH ?? '/';

function githubPagesSPAFallbackPlugin(): Plugin {
  return {
    name: 'github-pages-spa-fallback',
    apply: 'build',
    closeBundle() {
      if (base !== '/') {
        copyFileSync(resolve('dist', 'index.html'), resolve('dist', '404.html'));
      }
    },
  };
}

export default defineConfig({
  base,
  plugins: [react(), githubPagesSPAFallbackPlugin()],
});
