/**
 * Mock Backend Server
 * Handles real ZK proof generation with SDK fully installed
 */

import express from 'express';
import cors from 'cors';
import { handlePrecomputes } from './api/precomputes.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'mock-backend', zkProofs: 'enabled' });
});

// API Routes
app.post('/api/precomputes', handlePrecomputes);

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Mock Backend Server running on http://localhost:${PORT}`);
  console.log(`   Real ZK proof generation: ENABLED`);
  console.log(`   SDK: INSTALLED`);
  console.log(`   Endpoints:`);
  console.log(`     GET  /health - Health check`);
  console.log(`     POST /api/precomputes - Generate ZK precomputes\n`);
});



