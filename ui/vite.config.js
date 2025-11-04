import { loadEnv } from 'vite'

// Load env file based on `mode` in the current working directory.
// Set the third parameter to '' to load all env regardless of the
// `VITE_` prefix.
const env = loadEnv('demo', process.cwd(), '')

export default {
  // vite config
  server: {
    // Required for SharedArrayBuffer (needed by bb.js for multithreading)
    // Using credentialless mode to allow external API calls while supporting SharedArrayBuffer
    headers: {
      'Cross-Origin-Embedder-Policy': 'credentialless',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
    cors: true,
    // Proxy Blockaid API to avoid CORS issues
    proxy: {
      '/api/blockaid': {
        target: 'https://api.blockaid.io',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/blockaid/, ''),
        secure: true
      }
    }
  },
  build: {
    sourcemap: true,
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true
    },
    target: 'esnext'
  },
  optimizeDeps: {
    esbuildOptions: { 
      target: "esnext"
    },
    exclude: [
      '@noir-lang/noirc_abi', 
      '@noir-lang/acvm_js',
      '@aztec/bb.js'
    ]
  },
  worker: {
    format: 'es'
  },
  define: {
    ANVIL_ALICE_PRIVATE_KEY: JSON.stringify(env.ANVIL_ALICE_PRIVATE_KEY),
    BLOCK_EXPLORER_URL: JSON.stringify(env.BLOCK_EXPLORER_URL),
    JSON_RPC_URL: JSON.stringify(env.JSON_RPC_URL)
  }
}