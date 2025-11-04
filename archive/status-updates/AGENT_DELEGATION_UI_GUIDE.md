# Agent Delegation UI Guide

## 🎯 Overview

The UI now supports **agent-based delegation setup** where users can:
1. Set up an agent wallet (generate or use existing)
2. Configure delegation for that agent
3. Create subscriptions using the agent wallet with delegation

## 🚀 Flow

### Step 1: Agent Setup

1. **Toggle "Use Agent Wallet"** ON
2. **Option A: Generate New Agent Wallet**
   - Leave private key field empty
   - Click "Generate Agent Wallet"
   - System generates a new wallet and displays address + balance
   - Private key is shown (store securely!)

3. **Option B: Use Existing Agent Wallet**
   - Enter private key in the password field
   - Click "Set Up Agent"
   - System validates and displays address + balance

### Step 2: Delegation Setup (Optional)

1. **Toggle "Use private delegation (Option A)"** ON
2. **Configure Policy Hash and Salt**
   - Default values provided (can customize)
   - Delegation leaf is automatically generated
3. **If Agent is Setup**: Click "Set Up Agent Delegation"
   - This binds the delegation to the agent wallet
   - Delegation leaf uses agent address in computation

### Step 3: Subscribe with Agent

1. **Enter subscription amount**
2. **Click "Subscribe for 12 months"**
3. **If Agent Mode Enabled**:
   - Agent wallet signs permit (no MetaMask popup!)
   - Delegation info included if delegation enabled
   - Subscription created using agent address

## 🎨 UI Components Added

### 1. Agent Wallet Setup Section

**Location**: Before Delegation Toggle

**Features**:
- Toggle to enable/disable agent mode
- Private key input (password field)
- Generate new wallet button
- Agent address display
- Balance display
- Reset agent button

**State Variables**:
```typescript
const [useAgent, setUseAgent] = useState(false);
const [agentPrivateKey, setAgentPrivateKey] = useState<string>("");
const [agentAddress, setAgentAddress] = useState<string>("");
const [agentBalance, setAgentBalance] = useState<string>("0");
const [agentSetup, setAgentSetup] = useState<boolean>(false);
```

### 2. Agent Delegation Setup

**Location**: Within Delegation Toggle (when agent is setup)

**Features**:
- "Set Up Agent Delegation" button (only shows when agent + delegation both enabled)
- Binds delegation to agent wallet address

## 🔧 Functions Added

### `handleSetupAgent()`
- Generates new agent wallet or validates existing private key
- Creates AgentWallet instance
- Checks balance
- Sets agent state

### `handleSetupAgentDelegation()`
- Sets up delegation for agent wallet
- Generates delegation leaf using agent address
- Binds policy hash + salt to agent

## 📝 Next Steps (To Complete Integration)

### 1. Update `handleSubscribe()` to Support Agent Mode

When `useAgent && agentSetup` is true:
- Use agent wallet instead of MetaMask
- Agent signs permit programmatically
- Use agent address instead of user address
- Include delegation info if enabled

### 2. Update Subscription Creation

Modify `handleCreateSubscription()` to:
- Check if agent mode is enabled
- Use agent address for `userAddress`
- Use agent-signed permit
- Include delegation fields if enabled

### 3. Update API to Support Agent Subscriptions

The `/api/subscription` endpoint already supports delegation fields, but needs:
- Agent wallet verification
- Agent permit validation
- Agent-based subscription management

## 🔐 Security Notes

⚠️ **Demo Mode**: 
- Private keys are shown in UI (for demo purposes)
- In production, use secure key management
- Never store private keys in localStorage or send via API

✅ **Production Recommendations**:
- Use HSM or encrypted key storage
- Store private keys server-side only
- Use API authentication for agent operations
- Implement rate limiting for agent subscriptions

## 🎯 Usage Example

```typescript
// User flow:
1. Toggle "Use Agent Wallet" → ON
2. Click "Generate Agent Wallet" → Agent address shown
3. Toggle "Use private delegation" → ON
4. Enter policy hash + salt (or use defaults)
5. Click "Set Up Agent Delegation" → Delegation configured
6. Enter subscription amount: $10.00
7. Click "Subscribe for 12 months"
   → Agent signs permit automatically
   → Subscription created with agent address
   → Delegation verification included
```

## 📊 State Flow

```
User Action → State Change → UI Update
──────────────────────────────────────
Toggle Agent → useAgent = true → Show agent setup UI
Generate Wallet → agentSetup = true → Show agent info
Toggle Delegation → useDelegation = true → Show delegation fields
Set Up Delegation → leafCommitment set → Delegation ready
Subscribe → Agent signs → Subscription created
```

## 🔄 Integration Points

### Current Integration
- ✅ UI components added
- ✅ State management
- ✅ Agent wallet generation
- ✅ Delegation setup functions

### Remaining Integration
- ⏳ Subscription flow using agent wallet
- ⏳ API support for agent subscriptions
- ⏳ Agent-based recurring payments
- ⏳ Delegation verification in agent flow

---

**Status**: UI complete! Now need to wire up subscription flow to use agent wallet when enabled.







