/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Custom modes ('js', 'py', etc.) map to language targets.
  // Standard modes ('development', 'production', 'test') default to 'js'.
  const lang = mode && !['development', 'production', 'test'].includes(mode) ? mode : 'js';

  return {
    plugins: [react()],
    base: '/',
    build: {
      outDir: lang === 'js' ? 'docs' : `docs-${lang}`,
    },
    test: {
      // @vitejs/plugin-react (Babel) initialization races across parallel
      // worker threads on Windows, causing intermittent "Cannot read
      // properties of undefined (reading 'config')" failures.
      fileParallelism: false,
    },
  };
})
