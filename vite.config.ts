/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: 'docs',
  },
  test: {
    // @vitejs/plugin-react (Babel) initialization races across parallel
    // worker threads on Windows, causing intermittent "Cannot read
    // properties of undefined (reading 'config')" failures.
    fileParallelism: false,
  },
})
