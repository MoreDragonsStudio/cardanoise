import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset paths so dist/ works when uploaded to any static host,
  // including being served from a subdirectory.
  base: './',
  test: {
    environment: 'node',
  },
});
