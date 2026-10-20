/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' para o build abrir de qualquer pasta (ex.: GitHub Pages)
export default defineConfig({
  plugins: [react()],
  base: './',
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
});
