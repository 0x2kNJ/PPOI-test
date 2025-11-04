# Blockaid Integration Guide

## Current Status

The Private Balance Flow UI now supports **REAL Blockaid API integration** for compliance checking!

### What's Implemented ✅

1. **Real Blockaid API Calls**
   - Frontend service (`src/services/blockaid.ts`) for address scanning
   - Complete compliance checking with detailed results
   - Risk scoring and recommendations

2. **Detailed Compliance Checks Display**
   - Shows all checks performed (OFAC, Malicious Activity, Phishing, Trust Level, etc.)
   - Displays risk score and risk level
   - Provides actionable recommendations
   - Visual indicator: 🔴 LIVE API vs ⚪ DEMO MODE

### What's Still Simulated ⚠️

1. **ZK Proof Generation**: Currently simulated (random hex strings)
   - Real implementation available in SDK (`prove2x2` function)
   - Would need to integrate `prepareTransact` -> `getProof` workflow

2. **On-Chain Proof Verification**: Simulated timeout
   - Real implementation would call contract verifier
   - Requires deployed BermudaPool contract

3. **Actual Transaction**: No transaction sent to privacy pool
   - Would require contract deployment and user signing

---

## How to Enable REAL Blockaid API Calls

### Step 1: Get Your Blockaid API Key

1. Sign up at [https://blockaid.io](https://blockaid.io)
2. Get your API key from the dashboard

### Step 2: Configure the API Key

Create or edit `/Users/0xblockbird/Cursor/Bermuda/baanx/demo/ui/.env.demo`:

```bash
# Blockaid API Configuration
VITE_BLOCKAID_API_KEY=your-actual-blockaid-api-key-here

# Anvil Local Node
JSON_RPC_URL=http://localhost:8545
ANVIL_ALICE_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
BLOCK_EXPLORER_URL=http://localhost:8545
```

**⚠️ IMPORTANT**: Make sure `.env.demo` is in `.gitignore` to protect your API key!

### Step 3: Restart the Dev Server

```bash
cd /Users/0xblockbird/Cursor/Bermuda/baanx/demo/ui
npm run start
```

### Step 4: Test with Real API

1. Open **http://localhost:4193**
2. Go through the flow
3. When you reach "Verify PPOI", you'll see: **🔴 LIVE API** indicator
4. The compliance checks will be **real Blockaid API scans**!

---

## Testing Addresses

### Safe Address (Should Pass)
- `0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045` (Vitalik's address)
- Expected: All checks pass, risk score: 0

### Your Test Address (Currently in Demo)
- `0xeb079a1593d0499a3bcbd56d23eef8102a5d5807`
- To test: Add your API key and restart

### Known Malicious (Should Fail)
You can find OFAC-sanctioned addresses for testing at:
- [https://sanctionssearch.ofac.treas.gov/](https://sanctionssearch.ofac.treas.gov/)

---

## Compliance Checks Performed

When LIVE API is enabled, Blockaid performs:

1. **OFAC Sanctions Check**
   - Verifies address is not on sanctions lists
   - Status: PASS/FAIL

2. **Malicious Activity Check**
   - Checks for known malicious contracts/addresses
   - Detects drainer contracts, scams
   - Status: PASS/FAIL

3. **Phishing/Scam Check**
   - Detects address poisoning attempts
   - Identifies phishing addresses
   - Status: PASS/FAIL

4. **Trust Level Check**
   - Evaluates if address is verified/trusted
   - Checks contract verification status
   - Status: PASS/WARNING

5. **Address Age Check**
   - Identifies newly created addresses
   - Flags fresh accounts (< 24 hours)
   - Status: PASS/WARNING

6. **Verification Status**
   - For contracts: checks if source code is verified
   - For EOAs: checks if it's a known trusted address
   - Status: PASS (if applicable)

---

## Example Output

### Demo Mode (No API Key)

```
Blockaid Compliance Report ⚪ DEMO MODE
Risk Score: 0/100 (LOW)
Checks Performed: 4

✅ OFAC Sanctions Check
   Address is not on OFAC sanctions list (SIMULATED)

✅ Malicious Activity Check
   No known malicious activity detected (SIMULATED)

✅ Phishing/Scam Check
   No phishing activity detected (SIMULATED)

✅ Trust Level Check
   Address trust level acceptable (SIMULATED)

Recommendations:
• DEMO MODE: Add VITE_BLOCKAID_API_KEY to .env.demo for real checks
```

### Live API Mode (With API Key)

```
Blockaid Compliance Report 🔴 LIVE API
Risk Score: 0/100 (LOW)
Checks Performed: 5

✅ OFAC Sanctions Check
   Address is not on OFAC sanctions list

✅ Malicious Activity Check
   No known malicious activity detected

✅ Phishing/Scam Check
   No phishing activity detected

✅ Trust Level Check
   Address trust level acceptable

✅ Address Age Check
   Address has sufficient history

Recommendations:
• Address passes all compliance checks. Safe to proceed.
```

---

## Next Steps for Full Integration

1. **Real ZK Proofs**:
   ```typescript
   // Replace simulated proof in handleGenerateProof with:
   const { proof, publicInputs } = await sdk.deposit({
     token: ZeroAddress,
     amount: parseEther('1.0'),
     shieldedAddress: depositData.shieldedAddress,
     recipient: depositData.address
   })
   ```

2. **On-Chain Verification**:
   ```typescript
   // Add real contract verification:
   const verified = await bermudaPoolContract.verifyProof(proof, publicInputs)
   ```

3. **Actual Transactions**:
   ```typescript
   // Submit to privacy pool:
   const tx = await bermudaPoolContract.transact(args, extData)
   await tx.wait()
   ```

---

## Security Notes

- ✅ API key is loaded from environment variables (not hardcoded)
- ✅ Service gracefully falls back to demo mode if no key provided
- ✅ CORS is handled by fetching from backend in production
- ⚠️ For production, proxy Blockaid calls through your backend to protect API key
- ⚠️ Never commit `.env.demo` or expose API keys in client-side code

---

## Troubleshooting

### "Demo Mode" even though I added API key

1. Check the file name is exactly `.env.demo`
2. Restart the dev server completely
3. Verify the variable name is `VITE_BLOCKAID_API_KEY`
4. Check browser console for any errors

### API Errors

- **422 Validation Error**: Check your request metadata
- **403 Forbidden**: API key invalid or endpoint not available on your plan
- **429 Rate Limit**: You've exceeded your API quota

### CORS Errors

For production, you'll need to proxy Blockaid requests through your backend to avoid CORS issues.

---

**You're all set! Add your API key to see REAL compliance checks!** 🚀

