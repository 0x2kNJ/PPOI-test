import React from 'react'
import { createRoot } from 'react-dom/client'

// Switch between apps:
// - Private Balance Flow (standalone)
// - Private Debit Card Demo (original)

import PPOIFlowDemo from './src/components/PPOIFlowDemo'
// import App from './App'

const container = document.getElementById('root')
if (!container) {
  throw new Error('Root element not found')
}

const root = createRoot(container)

// Private Balance Flow - Standalone page (no debit card demo)
root.render(
  <React.StrictMode>
    <PPOIFlowDemo />
  </React.StrictMode>
)

// To use the original Debit Card Demo, uncomment below and comment above:
// root.render(<App />)
