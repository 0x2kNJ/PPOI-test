import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Allow Vite to resolve dependencies from SDK
    dedupe: ['ethers'],
  },
  optimizeDeps: {
    include: [
      '@aztec/bb.js',
      '@noble/curves',
      '@noir-lang/noir_js',
      'ethers',
    ],
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
  },
})

