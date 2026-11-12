/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' lets the built site work from any folder (e.g. GitHub Pages).
export default defineConfig({
  base: './',
  plugins: [react()],
  test: { environment: 'node' },
});
