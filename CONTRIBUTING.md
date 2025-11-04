# Contributing to PPOI Demo

Thank you for your interest in contributing! This guide will help you get started.

## Development Setup

### Prerequisites
- Node.js 18+ and npm
- Git
- MetaMask browser extension
- Self Protocol mobile app (for testing)

### Initial Setup

```bash
# Clone repository
git clone <repo-url>
cd baanx/demo

# Install frontend dependencies
cd ui
npm install

# Install backend dependencies
cd ../backend
npm install
```

### Running Locally

```bash
# Terminal 1: Start backend
cd backend
npm start

# Terminal 2: Start frontend
cd ui
npm run dev

# Terminal 3: (Optional) Start tunnel for mobile testing
cloudflared tunnel --url http://localhost:3001
```

## Project Structure

```
demo/
├── ui/                      # Frontend (React + Vite)
│   ├── src/
│   │   ├── components/      # React components
│   │   └── services/        # API clients
│   └── package.json
│
├── backend/                 # Backend (Express + WebSocket)
│   ├── mock-server.js
│   └── package.json
│
└── docs/                    # Documentation
    ├── ARCHITECTURE.md
    ├── SELF_PROTOCOL.md
    └── BLOCKAID.md
```

## Coding Conventions

### TypeScript/JavaScript

**Style:**
- Use 2 spaces for indentation
- Use single quotes for strings
- Use semicolons
- Use `const` by default, `let` when reassignment needed
- Never use `var`

**Naming:**
```typescript
// Variables and functions: camelCase
const userName = 'John';
function handleClick() {}

// Classes and types: PascalCase
class UserService {}
interface UserData {}
type StatusType = 'idle' | 'loading';

// Constants: UPPER_SNAKE_CASE
const API_BASE_URL = 'https://api.example.com';
const MAX_RETRIES = 3;

// React components: PascalCase
function PPOIFlowDemo() {}
const SelfQRCodeDisplay = () => {};
```

**Async/Await:**
```typescript
// ✅ Good
async function fetchData() {
  try {
    const response = await api.get('/data');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch data:', error);
    throw error;
  }
}

// ❌ Bad
function fetchData() {
  return api.get('/data')
    .then(response => response.data)
    .catch(error => {
      console.error(error);
    });
}
```

**Error Handling:**
```typescript
// ✅ Good
try {
  await riskyOperation();
} catch (error) {
  console.error('[Component] Operation failed:', error);
  // Handle error appropriately
  showErrorMessage(error.message);
}

// ❌ Bad
try {
  await riskyOperation();
} catch (e) {
  // Silent failure
}
```

### React Components

**Functional Components:**
```typescript
// ✅ Good
interface Props {
  userName: string;
  onSave: (data: UserData) => void;
}

export function UserProfile({ userName, onSave }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  
  return (
    <div>
      {/* Component JSX */}
    </div>
  );
}

// ❌ Bad - Don't use default exports for components
export default function UserProfile(props) {
  // ...
}
```

**State Management:**
```typescript
// ✅ Good - Descriptive state names
const [isLoading, setIsLoading] = useState(false);
const [userData, setUserData] = useState<UserData | null>(null);
const [errorMessage, setErrorMessage] = useState<string>('');

// ❌ Bad - Generic names
const [flag, setFlag] = useState(false);
const [data, setData] = useState(null);
const [err, setErr] = useState('');
```

**Effects:**
```typescript
// ✅ Good - Single responsibility, proper cleanup
useEffect(() => {
  const ws = new WebSocket(url);
  
  ws.onopen = () => console.log('Connected');
  ws.onerror = (error) => console.error('Error:', error);
  
  return () => ws.close();
}, [url]);

// ❌ Bad - Multiple responsibilities, no cleanup
useEffect(() => {
  fetch('/api/data');
  const ws = new WebSocket(url);
  localStorage.setItem('key', 'value');
}, []);
```

### Logging

**Console Messages:**
```typescript
// Use consistent prefixes
console.log('[ComponentName] Message');
console.error('[ComponentName] Error:', error);
console.warn('[ComponentName] Warning:', warning);

// For debugging (remove before commit)
console.debug('[ComponentName] Debug info:', data);
```

**Log Levels:**
- `console.log` - General information
- `console.error` - Errors that need attention
- `console.warn` - Warnings about deprecated features or potential issues
- `console.debug` - Detailed debugging (should be removed before production)

## Adding Features

### New Compliance Provider

To add a new compliance provider (e.g., "ChainAnalysis"):

1. **Create service file:**
```typescript
// ui/src/services/chainanalysis.ts

export interface ChainAnalysisCheck {
  passed: boolean;
  riskScore: number;
  checks: Array<{
    name: string;
    status: 'PASS' | 'FAIL';
    description: string;
  }>;
}

export class ChainAnalysisService {
  private apiKey: string;
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
  
  async checkAddress(address: string): Promise<ChainAnalysisCheck> {
    // Implementation
  }
}

export function createChainAnalysisService(apiKey: string) {
  return new ChainAnalysisService(apiKey);
}
```

2. **Add to main component:**
```typescript
// ui/src/components/PPOIFlowDemo.tsx

import { createChainAnalysisService } from '../services/chainanalysis';

const chainAnalysisService = createChainAnalysisService(API_KEY);

// Add toggle
const [enableChainAnalysis, setEnableChainAnalysis] = useState(false);

// Add verification handler
const handleVerifyChainAnalysis = async () => {
  // Implementation
};

// Update composite PPOI note
if (enableChainAnalysis && chainAnalysisData) {
  ppoiData.verifications.push({
    type: 'chainanalysis',
    riskScore: chainAnalysisData.riskScore,
    checks: chainAnalysisData.checks
  });
}
```

3. **Update documentation:**
- Add section to `docs/ARCHITECTURE.md`
- Update README with setup instructions
- Add configuration to `.env.example`

### New Verification Type

For Self Protocol verification types:

```typescript
// Add to selfVerificationType state
type VerificationType = 'humanity' | 'age' | 'nationality' | 'full' | 'document'; // Add 'document'

// Add to switch statement in handleVerifySelf
case 'document':
  request = {
    requestedAttributes: ['passport_number', 'date_of_birth'],
    constraints: { /* ... */ }
  };
  break;

// Add to UI dropdown
<option value="document">Document Verification</option>
```

## Testing

### Manual Testing Checklist

- [ ] Wallet connection works
- [ ] Deposit creation generates valid UTXO
- [ ] Blockaid verification returns results
- [ ] Self Protocol QR code displays
- [ ] QR code scans successfully on mobile
- [ ] Verification completes and UI updates
- [ ] PPOI note attaches correctly
- [ ] Commitment changes after note attachment
- [ ] All console logs are appropriate

### Adding Tests (TODO)

We need to add:
- Unit tests for services
- Component tests for React components
- Integration tests for full flow
- E2E tests with Playwright

Example structure:
```
ui/src/
├── services/
│   ├── blockaid.ts
│   └── blockaid.test.ts
└── components/
    ├── PPOIFlowDemo.tsx
    └── PPOIFlowDemo.test.tsx
```

## Pull Request Process

1. **Branch Naming:**
   - Feature: `feature/description`
   - Bug fix: `fix/description`
   - Docs: `docs/description`

2. **Commit Messages:**
   ```
   feat: Add ChainAnalysis integration
   fix: Resolve WebSocket reconnection issue
   docs: Update Self Protocol setup guide
   refactor: Extract QR code component
   test: Add blockaid service tests
   chore: Update dependencies
   ```

3. **PR Description Template:**
   ```markdown
   ## Description
   Brief description of changes
   
   ## Type of Change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Documentation
   - [ ] Refactoring
   
   ## Testing
   - [ ] Tested locally
   - [ ] Added/updated tests
   - [ ] Updated documentation
   
   ## Screenshots (if UI changes)
   [Add screenshots]
   ```

4. **Review Checklist:**
   - [ ] Code follows style guide
   - [ ] No console.debug or commented code
   - [ ] Error handling is appropriate
   - [ ] Documentation updated
   - [ ] No sensitive data (API keys, private keys) committed

## Documentation

### Inline Comments

```typescript
// ✅ Good - Explain WHY, not WHAT
// Extract last 32 hex chars because Self Protocol embeds
// the UUID within a larger hex-encoded userContextData field
const uuidHex = hex.slice(-32);

// ❌ Bad - States the obvious
// Get the last 32 characters
const uuidHex = hex.slice(-32);
```

### Function Documentation

```typescript
/**
 * Extracts session ID from Self Protocol's userContextData.
 * 
 * Self Protocol encodes the userId (our sessionId) as hex within
 * the userContextData string. This function extracts and reconstructs
 * the UUID with proper formatting.
 * 
 * @param userContextData - Hex string from Self Protocol callback
 * @returns Formatted UUID (e.g., "350bf862-88b6-4d22-a03c-249d033cb80e")
 * @throws Error if userContextData is invalid
 */
function extractSessionId(userContextData: string): string {
  // Implementation
}
```

## Common Pitfalls

### 1. Environment Variables

❌ **Wrong:**
```typescript
const apiKey = process.env.REACT_APP_API_KEY; // Doesn't work in Vite
```

✅ **Correct:**
```typescript
const apiKey = import.meta.env.VITE_API_KEY; // Vite uses VITE_ prefix
```

### 2. WebSocket Cleanup

❌ **Wrong:**
```typescript
useEffect(() => {
  const ws = new WebSocket(url);
  // No cleanup - memory leak!
}, []);
```

✅ **Correct:**
```typescript
useEffect(() => {
  const ws = new WebSocket(url);
  return () => ws.close();
}, [url]);
```

### 3. State Updates After Unmount

❌ **Wrong:**
```typescript
async function fetchData() {
  const data = await api.get('/data');
  setData(data); // May error if component unmounted
}
```

✅ **Correct:**
```typescript
useEffect(() => {
  let cancelled = false;
  
  async function fetchData() {
    const data = await api.get('/data');
    if (!cancelled) setData(data);
  }
  
  fetchData();
  return () => { cancelled = true; };
}, []);
```

## Resources

- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Self Protocol Docs](https://docs.self.xyz/)
- [Blockaid API](https://docs.blockaid.io/)
- [Vite Guide](https://vitejs.dev/guide/)

## Questions?

- Open an issue for bugs or feature requests
- Start a discussion for questions
- Check existing issues before creating new ones

## Code of Conduct

- Be respectful and constructive
- Focus on the code, not the person
- Welcome newcomers
- Help others learn
- Keep discussions on-topic

---

Thank you for contributing! 🎉

