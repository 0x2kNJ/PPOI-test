import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Allow Vite to resolve dependencies from SDK
    dedupe: ['ethers'],
    alias: {
      // Map SDK imports to correct paths
      'bermuda-bay-sdk': path.resolve(__dirname, './lib/sdk/build/src/index.js'),
    },
  },
  optimizeDeps: {
    include: [
      '@aztec/bb.js',
      '@noble/curves',
      '@noir-lang/noir_js',
      'ethers',
      'react',
      'react-dom',
    ],
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
  },
})

