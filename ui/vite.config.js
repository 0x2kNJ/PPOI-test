import { loadEnv } from 'vite'

// Load env file based on `mode` in the current working directory.
// Set the third parameter to '' to load all env regardless of the
// `VITE_` prefix.
const env = loadEnv('demo', process.cwd(), '')

export default {
  // vite config
  build: {
    sourcemap: true
  },
  optimizeDeps: {
    esbuildOptions: { target: "esnext" },
    exclude: ['@noir-lang/noirc_abi', '@noir-lang/acvm_js']
  },
  define: {
    ANVIL_ALICE_PRIVATE_KEY: JSON.stringify(env.ANVIL_ALICE_PRIVATE_KEY),
    BLOCK_EXPLORER_URL: JSON.stringify(env.BLOCK_EXPLORER_URL),
    JSON_RPC_URL: JSON.stringify(env.JSON_RPC_URL)
  }
}