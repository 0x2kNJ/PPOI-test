import React from 'react'
import { createRoot } from 'react-dom/client'
import PPOIFlowDemo from './src/components/PPOIFlowDemo'

// Private Balance Flow - Standalone Page
// No reference to debit card demo

const container = document.getElementById('root')
if (!container) {
  throw new Error('Root element not found')
}

const root = createRoot(container)
root.render(
  <React.StrictMode>
    <PPOIFlowDemo />
  </React.StrictMode>
)

