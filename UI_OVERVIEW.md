# UI Overview - x402 Private Subscriptions Demo

## 🎨 Visual Design

The UI uses a **dark theme** with a modern, clean layout:

- **Background**: Dark gray (`#1a1a1a`)
- **Cards**: Medium gray (`#2a2a2a`) 
- **Text**: White (`#ffffff`) for primary, Gray (`#a0a0a0`) for secondary
- **Accents**: Blue (`#3b82f6`) for buttons, Green (`#22c55e`) for success states
- **Font**: System fonts (-apple-system, BlinkMacSystemFont, Segoe UI, Roboto)
- **Layout**: Centered, max-width 600px container

---

## 📱 UI Components & Sections

### 1. **Header Section** (Top)

```
┌─────────────────────────────────────────────────────┐
│  x402-based Private Subscriptions    [🔌 Connect]   │
│  Private, gasless, and merchant-bound...            │
└─────────────────────────────────────────────────────┘
```

**Features**:
- Title: "x402-based Private Subscriptions"
- Subtitle: "Private, gasless, and merchant-bound pull-payments using Bermuda"
- **Connect Wallet Button**: Right-aligned, shows connection status
- When connected: Shows truncated address + "Reconnect" button

**State**:
- Not Connected: Blue "🔌 Connect Wallet" button
- Connected: Green checkmark + address (first 6 + last 4 chars)

---

### 2. **Subscription Amount Input**

```
┌─────────────────────────────────────────────────────┐
│ Monthly Subscription Fee (USDC)                     │
│ ┌─────────────────────────────────────────────┐   │
│ │ 10.00                                        │   │
│ └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

**Features**:
- Text input for subscription amount
- Placeholder/default: "10.00"
- Dark background, white text

---

### 3. **Agent Wallet Section** (Toggle)

```
┌─────────────────────────────────────────────────────┐
│ 🤖 Use Agent Wallet        [Toggle Switch]         │
│                                                     │
│ (If enabled)                                        │
│ ┌─────────────────────────────────────────────┐   │
│ │ Private Key: [Input] [Generate]             │   │
│ │ Address: 0xABC...DEF                        │   │
│ │ Balance: 0.0 ETH                            │   │
│ └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

**Features**:
- Toggle switch (green when enabled)
- **Private Key Input**: Text field (truncated for privacy)
- **Generate Button**: Creates new agent wallet
- **Agent Address**: Display (truncated)
- **Balance**: Shows agent ETH balance

**Privacy**: Private keys are truncated (first 6 + last 4 chars) with warning

---

### 4. **Delegation Section** (Toggle)

```
┌─────────────────────────────────────────────────────┐
│ 🔐 Use Private Delegation (Option A) [Toggle]        │
│                                                     │
│ (If enabled)                                        │
│ ┌─────────────────────────────────────────────┐   │
│ │ Policy Hash: [0x1111...]                    │   │
│ │ Salt: [0x2222...]                           │   │
│ │ Delegation Leaf: 0xABC123...                │   │
│ └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

**Features**:
- Toggle switch for delegation
- **Policy Hash Input**: Hex string input (default: `0x11...`)
- **Salt Input**: Hex string input (default: `0x22...`)
- **Delegation Leaf**: Auto-calculated from policy hash + salt
- Real-time calculation when inputs change

---

### 5. **Subscribe Button**

```
┌─────────────────────────────────────────────────────┐
│ [Subscribe for 12 months] (Blue button, centered)   │
└─────────────────────────────────────────────────────┘
```

**Features**:
- Large, prominent button
- Blue background (`#3b82f6`)
- Disabled when loading
- Triggers subscription flow:
  1. Generate ZK precomputes
  2. Sign permit (MetaMask or agent)
  3. Create subscription
  4. Execute first payment

---

### 6. **Subscription Policy Toggle**

```
┌─────────────────────────────────────────────────────┐
│ 🔒 Subscription Policy    Active [Toggle]           │
└─────────────────────────────────────────────────────┘
```

**Features**:
- Toggle switch (green when active)
- Controls whether first payment is allowed
- If inactive, first payment is blocked

---

### 7. **Precomputes & Permit Details** (Expandable)

```
┌─────────────────────────────────────────────────────┐
│ > Precomputes & Permit                              │
│                                                     │
│ (If expanded)                                       │
│ ┌─────────────────────────────────────────────┐   │
│ │ Note ID: 0xABC123...                       │   │
│ │ Max Amount: $120.00                        │   │
│ │ Buckets: 14 (truncated ladder)              │   │
│ │ Permit: 0xDEF456... (or "Not signed")      │   │
│ └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

**Features**:
- Click to expand/collapse
- Shows technical details:
  - Note ID (truncated)
  - Max amount (12 months × subscription amount)
  - Number of buckets (precompute count)
  - Permit signature status

---

### 8. **Status Messages**

```
┌─────────────────────────────────────────────────────┐
│ Status: [Dynamic status messages]                   │
│                                                     │
│ Examples:                                           │
│ • "⚡ Generating real ZK precomputes..."            │
│ • "📝 Please sign the permit in MetaMask..."        │
│ • "✅ Payment successful! TX: 0xABC..."             │
│ • "❌ Error: [error message]"                       │
└─────────────────────────────────────────────────────┘
```

**Features**:
- Real-time status updates
- Color-coded:
  - Green (✓): Success
  - Blue (⚡): Processing
  - Red (❌): Error
  - Yellow (⚠️): Warning

---

### 9. **Active Subscriptions List**

```
┌─────────────────────────────────────────────────────┐
│ Active Subscriptions                                │
│                                                     │
│ ┌─────────────────────────────────────────────┐   │
│ │ $10.00 / monthly    [Charge Now]             │   │
│ │ Next charge: Jan 15, 2024                    │   │
│ │ Last charged: Jan 1, 2024                    │   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
│ ┌─────────────────────────────────────────────┐   │
│ │ $25.00 / monthly    [Charge Now]             │   │
│ │ Next charge: Feb 1, 2024                     │   │
│ └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

**Features**:
- Lists all active subscriptions
- Each subscription shows:
  - Amount and interval
  - Next charge date
  - Last charged date (if applicable)
  - **Charge Now** button (if chargeable)
  - Overdue indicator (if applicable)

**Button States**:
- **Available**: Blue "Charge Now" button
- **Overdue**: Red "Charge Now" button
- **Scheduled**: Shows "Scheduled" text (no button)

---

### 10. **Payment Confirmation Card**

```
┌─────────────────────────────────────────────────────┐
│ Confirmation                                        │
│                                                     │
│ ┌─────────────────────────────────────────────┐   │
│ │ ✓ Payment Successful - On-Chain Proof        │   │
│ │                                             │   │
│ │ Transaction Hash                            │   │
│ │ 0xABC123DEF456...                           │   │
│ │                                             │   │
│ │ Amount                                      │   │
│ │ $10.00 USDC                                 │   │
│ │                                             │   │
│ │ Time                                        │   │
│ │ Jan 1, 2024, 12:00 PM                       │   │
│ │                                             │   │
│ │ Privacy                                     │   │
│ │ ✓ Zero-Knowledge Proof Verified             │   │
│ └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

**Features**:
- Appears after successful payment
- Shows transaction hash (full, clickable)
- Shows amount in USDC
- Shows timestamp
- Shows privacy verification status

---

### 11. **Auto-Recurring Payments Progress**

```
┌─────────────────────────────────────────────────────┐
│ 🔄 Auto-Recurring Payments Active                   │
│                                                     │
│ ┌─────────────────────────────────────────────┐   │
│ │ Payment Progress                             │   │
│ │ 5 / 12 Payments Completed                    │   │
│ │ ████████░░░░░░░░ 42%                        │   │
│ │                                             │   │
│ │ Next Payment In                             │   │
│ │ ⏰ 00:07                                     │   │
│ │                                             │   │
│ │ [Cancel Auto-Payments] (Red button)         │   │
│ └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

**Features**:
- Shows payment progress (X/12 payments)
- Progress bar (visual)
- Countdown timer (mm:ss format)
- **Cancel** button to stop auto-payments
- Border highlight (blue) when active

**Timer**:
- Counts down from 10 seconds
- Shows: `00:10`, `00:09`, `00:08`, etc.
- Auto-triggers next payment at `00:00`

---

## 🎨 Color Scheme

| Element | Color | Hex Code |
|---------|-------|----------|
| Background | Dark Gray | `#1a1a1a` |
| Cards | Medium Gray | `#2a2a2a` |
| Primary Text | White | `#ffffff` |
| Secondary Text | Gray | `#a0a0a0` |
| Primary Button | Blue | `#3b82f6` |
| Success | Green | `#22c55e` |
| Error | Red | `#dc2626` |
| Inactive Toggle | Gray | `#4a4a4a` |
| Border | Dark Gray | `#3a3a3a` |

---

## 📱 Responsive Design

- **Max Width**: 600px (centered)
- **Padding**: 2rem on all sides
- **Mobile-Friendly**: Responsive layout
- **Font Sizes**: 
  - Headings: 2rem, 1.25rem
  - Body: 0.95rem, 0.85rem
  - Monospace: For addresses/hashes

---

## 🔄 Interactive Elements

1. **Toggle Switches**: 
   - Smooth animations
   - Color changes on state
   - Click to toggle

2. **Buttons**:
   - Hover effects (color darkens)
   - Disabled states (opacity reduced)
   - Loading states ("Processing...")

3. **Expandable Sections**:
   - Click to expand/collapse
   - Arrow rotates on expand

4. **Input Fields**:
   - Dark background
   - White text
   - Focus states (outline)

---

## 🎯 User Flow

1. **Connect Wallet** → Shows address
2. **Enter Amount** → Enter subscription amount
3. **Optionally: Enable Agent** → Set up agent wallet
4. **Optionally: Enable Delegation** → Configure policy hash + salt
5. **Click Subscribe** → 
   - Generates ZK precomputes
   - Prompts for permit signature
   - Creates subscription
   - Executes first payment
6. **View Confirmation** → Shows transaction details
7. **Auto-Payments** → Recurring payments every 10 seconds (demo)

---

## 📊 Visual Hierarchy

1. **Header** (Top) - Title + Wallet status
2. **Amount Input** - Primary action input
3. **Agent Section** - Optional privacy feature
4. **Delegation Section** - Optional privacy feature
5. **Subscribe Button** - Main CTA
6. **Policy Toggle** - Control feature
7. **Status** - Real-time feedback
8. **Subscriptions List** - Active subscriptions
9. **Confirmation** - Payment success
10. **Auto-Payments** - Progress tracking

---

## ✨ Privacy Features in UI

- **Private Keys**: Truncated display (first 6 + last 4 chars)
- **Addresses**: Truncated (first 6 + last 4 chars)
- **Hashes**: Truncated (first 20 chars + "...")
- **No Sensitive Data**: Sensitive fields are masked in UI
- **Secure Storage**: Encryption warnings for agent keys

---

## 🎬 Animation & Transitions

- **Toggle Switches**: Smooth slide animation (0.2s)
- **Buttons**: Hover color transitions
- **Expandable Sections**: Smooth expand/collapse
- **Progress Bar**: Animated fill
- **Countdown Timer**: Real-time updates

---

*Last Updated: 2025-11-02*







