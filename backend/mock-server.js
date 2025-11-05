import express from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer } from 'ws';

const app = express();
app.use(express.json());
app.use(cors());

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({ server });

// Store connected clients by sessionId
const connectedClients = new Map();

// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log('🔌 WebSocket: Client connected');

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log('📨 WebSocket: Received message:', data);

      if (data.type === 'register' && data.sessionId) {
        connectedClients.set(data.sessionId, ws);
        console.log(`✅ WebSocket: Registered client with sessionId: ${data.sessionId}`);
        
        ws.send(JSON.stringify({ 
          type: 'status', 
          status: 'registered', 
          sessionId: data.sessionId 
        }));
      }
    } catch (error) {
      console.error('❌ WebSocket: Error parsing message:', error.message);
    }
  });

  ws.on('close', () => {
    console.log('🔌 WebSocket: Client disconnected');
    // Remove client from map
    for (const [sessionId, client] of connectedClients.entries()) {
      if (client === ws) {
        connectedClients.delete(sessionId);
        console.log(`🗑️ WebSocket: Unregistered client ${sessionId}`);
        break;
      }
    }
  });

  ws.on('error', (error) => {
    console.error('❌ WebSocket: Error:', error.message);
  });
});

// Mock Self Protocol callback endpoint
app.post('/api/self-callback', async (req, res) => {
  console.log('📥 Received Self Protocol callback');
  console.log('Body:', JSON.stringify(req.body, null, 2));

  const { attestationId, proof, publicSignals, userContextData } = req.body;

  // Extract sessionId from userContextData
  // Self Protocol encodes the userId (our sessionId) in the userContextData
  // It's hex-encoded at the end of the userContextData string
  let sessionId = 'unknown';
  
  if (userContextData && typeof userContextData === 'string') {
    // The sessionId is embedded in the hex string
    // Format: 000000000000000000000000000000[sessionId without dashes]
    // Extract the last part and reconstruct the UUID
    const hex = userContextData.replace(/^0+/, ''); // Remove leading zeros
    
    // Try to find a valid UUID pattern in the hex
    // UUID format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    // In hex it's concatenated: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    if (hex.length >= 32) {
      const uuidHex = hex.slice(-32); // Get last 32 hex chars
      // Reconstruct UUID with dashes: 8-4-4-4-12
      sessionId = `${uuidHex.slice(0,8)}-${uuidHex.slice(8,12)}-${uuidHex.slice(12,16)}-${uuidHex.slice(16,20)}-${uuidHex.slice(20,32)}`;
    }
  }
  
  console.log(`🔍 Extracted sessionId: ${sessionId} from userContextData: ${userContextData}`);

  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Note: In a real implementation, you would:
  // 1. Verify the ZK proof using Self Protocol's verification SDK
  // 2. Extract the requested attributes from the proof
  // 3. Return only the checks that were actually requested
  // For this mock, we'll simulate success for whichever check was requested
  
  // Mock successful verification response
  // IMPORTANT: Remove OFAC - that's Blockaid's job, not Self Protocol's
  const mockResult = {
    status: 'success',
    result: true,
    verificationType: attestationId || 'humanity', // Use the actual attestation type
    checks: [
      { name: 'Identity Verification', status: 'PASS', description: '✅ Real ZK proof verified successfully' }
    ],
    recommendations: ['✅ Identity verification passed'],
    sessionId: sessionId,
    userData: {
      userIdentifier: userContextData || 'mock-user-123',
      userDefinedData: ''
    },
    discloseOutput: {
      nullifier: 'mock-nullifier-' + Date.now(),
      issuingState: 'USA',
      name: 'Test User',
      idNumber: 'MOCK123456',
      nationality: 'USA',
      dateOfBirth: '1990-01-01',
      gender: 'M',
      expiryDate: '2030-12-31',
      minimumAge: '18'
      // Note: OFAC screening is handled by Blockaid, not Self Protocol
    },
    isValidDetails: {
      isValid: true,
      isMinimumAgeValid: true
      // Note: OFAC screening is handled by Blockaid, not Self Protocol
    }
  };

  console.log('✅ Sending mock verification success');
  res.status(200).json(mockResult);

  // Send result to frontend via WebSocket if client is connected
  const client = connectedClients.get(sessionId);
  if (client && client.readyState === 1) { // 1 = OPEN
    console.log(`📤 WebSocket: Notifying client ${sessionId} of verification success`);
    client.send(JSON.stringify({
      type: 'verification_result',
      sessionId: sessionId,
      ...mockResult
    }));
  } else {
    console.log(`⚠️ WebSocket: Client ${sessionId} not found or not connected`);
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', mock: true, websocket: true });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Self Protocol Mock Backend with WebSocket',
    endpoints: {
      '/api/self-callback': 'POST - Receive and verify proofs',
      '/health': 'GET - Health check',
      'ws://': 'WebSocket - Real-time verification results'
    },
    connectedClients: connectedClients.size
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log('🎭 Mock Self Protocol backend running');
  console.log(`   HTTP: http://localhost:${PORT}`);
  console.log(`   WebSocket: ws://localhost:${PORT}`);
  console.log('   Status: Ready to receive verification requests');
  console.log('');
  console.log('💡 This is a MOCK server - it always returns success!');
  console.log('📡 WebSocket server ready for real-time updates');
});

