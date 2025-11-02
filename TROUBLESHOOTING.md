# X402 Troubleshooting Guide

Quick solutions to common issues with the X402 Private Pull-Payments demo.

---

## Table of Contents

1. [Installation Issues](#installation-issues)
2. [Runtime Errors](#runtime-errors)
3. [ZK Proof Generation Issues](#zk-proof-generation-issues)
4. [Wallet Connection Issues](#wallet-connection-issues)
5. [Transaction Errors](#transaction-errors)
6. [Performance Issues](#performance-issues)
7. [Debug Commands](#debug-commands)

---

## Installation Issues

### Issue: `npm install` fails with "Cannot find module"

**Error**:
```
Error: Cannot find module 'ethers'
```

**Solution**:
```bash
# Install dependencies in correct order
cd demo/mock-backend
npm install

cd ../apps/merchant-demo
npm install

cd ../../ui/lib/sdk
npm install --ignore-scripts
```

**Why**: The `--ignore-scripts` flag bypasses build scripts for private packages.

---

### Issue: "Cannot find package 'poseidon2-compression-ts'"

**Error**:
```
Error: Cannot find package 'poseidon2-compression-ts'
```

**Solution**:
```bash
# SDK requires this private package
cd demo/ui/lib/sdk
npm install --ignore-scripts

# Verify installation
ls node_modules/poseidon2-compression-ts
```

**Why**: This is a private GitHub package that requires manual installation.

---

### Issue: `nargo` or `bb` command not found

**Error**:
```
bash: nargo: command not found
bash: bb: command not found
```

**Solution**:
```bash
# Install Noir
curl -L https://raw.githubusercontent.com/noir-lang/noirup/main/install | bash
noirup

# Install Barretenberg
curl -L https://raw.githubusercontent.com/AztecProtocol/aztec-packages/master/barretenberg/cpp/installation/install | bash

# Verify installation
nargo --version
bb --version
```

---

### Issue: Noir compilation fails

**Error**:
```
error: Failed to resolve dependencies
```

**Solution**:
```bash
cd demo/lib/precompute-circuit

# Clean and recompile
rm -rf target/
nargo clean
nargo compile

# Verify output
ls target/precompute_circuit.json
```

---

## Runtime Errors

### Issue: "No precomputes available" error (FIXED in v1.0.0)

**Error**:
```
❌ No precomputes available. Please refresh the page and try subscribing again.
```

**Status**: ✅ **FIXED** in v1.0.0

**What was wrong**: React state race condition - `setPrecomputes()` was called but state wasn't updated before `handleCreateSubscription()` was called.

**What was fixed**: Precomputes are now passed directly as a parameter instead of relying on async state updates.

**If you still see this**:
1. Hard refresh browser (Cmd+Shift+R / Ctrl+Shift+F5)
2. Clear browser cache
3. Verify you're on latest version: check `demo/apps/merchant-demo/components/X402SubscriptionsDemo.tsx` line 260

---

### Issue: "SDK is required for real ZK proof generation"

**Error**:
```
SDK is required for real ZK proof generation. Error: Cannot find package 'ethers' imported from ...
```

**Solution**:
```bash
# Install SDK dependencies
cd demo/ui/lib/sdk
npm install --ignore-scripts

# Restart backend
cd ../../mock-backend
npm start
```

**Verify**:
```bash
curl http://localhost:3001/health | jq '.sdk'
# Should output: "installed"
```

---

### Issue: Backend fails to start

**Error**:
```
Error: EADDRINUSE: address already in use :::3001
```

**Solution**:
```bash
# Kill process on port 3001
lsof -ti:3001 | xargs kill -9

# Wait 2 seconds
sleep 2

# Restart backend
cd demo/mock-backend
npm start
```

**Or use different port**:
```bash
PORT=3002 npm start
```

---

### Issue: Frontend won't start

**Error**:
```
Error: EADDRINUSE: address already in use :::3000
```

**Solution**:
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Restart frontend
cd demo/apps/merchant-demo
npm run dev
```

---

## ZK Proof Generation Issues

### Issue: "Failed constraint assert(nullifier_hash == nullifier)"

**Error**:
```
error: Failed constraint assert(nullifier_hash == nullifier);
  ┌─ /Users/.../precompute-circuit/src/main.nr:34:12
```

**Cause**: Witness values don't satisfy circuit's nullifier constraint.

**Solution**:

Check `witnessGenerator.ts` uses correct Poseidon2 hash:

```typescript
// ✅ CORRECT
import { hash_3 } from 'poseidon2-compression-ts';

const signature = hash_3([privkey, commitment_hash, 0n]);
const nullifier_hash = hash_3([commitment_hash, 1n, signature]);

// ❌ WRONG
const nullifier_hash = utxo.getNullifier(); // Uses different hash
```

**Debug**:
```typescript
console.log('Commitment:', commitment_hash.toString(16));
console.log('Signature:', signature.toString(16));
console.log('Nullifier:', nullifier_hash.toString(16));
```

---

### Issue: "Failed constraint assert((amount + public_amount) == 0)"

**Error**:
```
error: Failed constraint assert((amount + public_amount) == 0);
  ┌─ /Users/.../precompute-circuit/src/main.nr:41:12
```

**Cause**: Incorrect field modulus handling for negative numbers.

**Solution**:

```typescript
// ❌ WRONG - JavaScript negative
const public_amount = -amount;

// ✅ CORRECT - Field arithmetic
const FIELD_MODULUS = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
const public_amount = ((-amount % FIELD_MODULUS) + FIELD_MODULUS) % FIELD_MODULUS;
```

**Verify**:
```typescript
const sum = (amount + public_amount) % FIELD_MODULUS;
console.log('Sum should be 0:', sum === 0n);
```

---

### Issue: "Witness file not generated"

**Error**:
```
Error: Witness file not generated at /Users/.../proof_5.gz
```

**Cause**: `nargo execute` outputs `precompute_circuit.gz`, not `proof_X.gz`.

**Solution** (already fixed in `zkProver.ts`):

```typescript
// Check for correct witness filename
const witnessPath = `${circuitDir}/target/precompute_circuit.gz`;

if (!existsSync(witnessPath)) {
  throw new Error(`Witness not generated at ${witnessPath}`);
}

// Rename for worker isolation
fs.renameSync(witnessPath, `${circuitDir}/target/proof_${workerId}.gz`);
```

**Manual check**:
```bash
ls -lah demo/lib/precompute-circuit/target/*.gz
```

---

### Issue: Proof generation is very slow

**Symptom**: Takes > 20 seconds to generate 17 proofs.

**Expected**: 5-7 seconds with parallel generation.

**Solutions**:

1. **Check worker pool size**:
```typescript
// In zkProver.ts
const WORKER_POOL_SIZE = 10; // Should be 10, not 1
```

2. **Check CPU usage**:
```bash
# During proof generation
top -o cpu
# Should see multiple 'bb' processes
```

3. **Use SSD for temp files**:
```typescript
// In zkProver.ts
const tempDir = tmpdir(); // Should use /tmp (usually SSD)
```

4. **Increase system resources**:
- RAM: 8GB+ recommended
- CPU: 4+ cores recommended

---

## Wallet Connection Issues

### Issue: MetaMask won't connect

**Error**:
```
❌ MetaMask authorization failed (code 4100)
```

**Solution**:

1. **Remove site from MetaMask**:
   - Open MetaMask
   - Settings → Connected Sites
   - Find `localhost:3000`
   - Click "Remove"

2. **Clear browser cache**:
   - Cmd+Shift+Delete (Mac) / Ctrl+Shift+Delete (Windows)
   - Clear "Cached images and files"

3. **Refresh page** (Cmd+R / Ctrl+R)

4. **Reconnect wallet**

---

### Issue: "Please switch to Anvil network"

**Error**:
```
❌ Please switch to Anvil network (chainId 31337)
```

**Solution** (should auto-switch, but if not):

1. **Manual network add**:
   - Open MetaMask
   - Networks → Add Network → Add a network manually
   - Network name: `Anvil`
   - RPC URL: `http://127.0.0.1:8545`
   - Chain ID: `31337`
   - Currency symbol: `ETH`

2. **Start Anvil**:
```bash
anvil --chain-id 31337
```

3. **Refresh page**

---

### Issue: "User rejected the request"

**Error**:
```
❌ Signature rejected by user (code 4001)
```

**Cause**: User clicked "Reject" in MetaMask.

**Solution**: Click "Subscribe" again and approve the signature.

---

## Transaction Errors

### Issue: "Transaction failed: permit expired"

**Error**:
```
execution reverted: permit expired
```

**Cause**: Permit expiry timestamp has passed.

**Solution**:

Check expiry in `X402SubscriptionsDemo.tsx`:
```typescript
// Should be future date (1 year from now)
const expiry = Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60);
```

**Debug**:
```javascript
const now = Math.floor(Date.now() / 1000);
const expiry = subscription.expiry;
console.log('Now:', now);
console.log('Expiry:', expiry);
console.log('Expired:', now > expiry);
```

---

### Issue: "Transaction failed: nonce used"

**Error**:
```
execution reverted: nonce used
```

**Cause**: Trying to reuse the same nonce.

**Solution**:

Use unique nonce for each permit:
```typescript
const nonce = Date.now() + Math.floor(Math.random() * 1000000);
```

---

### Issue: "Transaction failed: over max"

**Error**:
```
execution reverted: over max
```

**Cause**: Trying to charge more than `maxAmount` in permit.

**Solution**:

Ensure `maxAmount >= amount * number_of_months`:
```typescript
const amountWei = ethers.parseUnits(amount, 6);
const maxAmountWei = amountWei * BigInt(12); // 12 months
```

---

### Issue: "Insufficient funds for gas"

**Error**:
```
Error: insufficient funds for gas * price + value
```

**Cause**: Relayer wallet has no ETH.

**Solution**:

Fund relayer wallet:
```bash
# Get relayer address from .env.local
RELAYER_ADDR=$(cast wallet address $RELAYER_PRIVATE_KEY)

# Send ETH (if using Anvil)
cast send $RELAYER_ADDR --value 10ether --private-key 0xac0974...
```

---

## Performance Issues

### Issue: First request takes > 10 seconds

**Symptom**: Initial precompute generation is slow.

**Cause**: Cold start - circuit compilation, SDK initialization.

**Expected**: 7-10 seconds first time, 5-7 seconds after.

**Solution**: This is normal. Subsequent requests will be faster.

---

### Issue: Browser freezes during proof generation

**Symptom**: UI becomes unresponsive.

**Cause**: Backend is CPU-intensive during parallel proving.

**Solution**:

1. **Add loading states** (already implemented):
```typescript
setLoading(true);
setStatus("⚡ Generating real ZK precomputes...");
```

2. **Check backend logs** to ensure it's working:
```bash
cd demo/mock-backend
npm start
# Watch for "Generating proof X/17..." logs
```

3. **Don't refresh page** during proof generation.

---

### Issue: Memory errors during proof generation

**Error**:
```
FATAL ERROR: Reached heap limit Allocation failed
```

**Solution**:

Increase Node.js heap size:
```bash
export NODE_OPTIONS="--max-old-space-size=8192"

cd demo/mock-backend
npm start
```

---

## Debug Commands

### Check Backend Health

```bash
curl http://localhost:3001/health | jq
```

Expected:
```json
{
  "status": "ok",
  "zkProofGenerator": "enabled",
  "sdk": "installed"
}
```

---

### Test Single Proof Generation

```bash
curl -X POST http://localhost:3001/api/precomputes \
  -H "Content-Type: application/json" \
  -d '{
    "noteId": "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "maxAmountUsd": "1.00"
  }' | jq '.stats'
```

Expected:
```json
{
  "total": 17,
  "realProofs": 17,
  "mockProofs": 0,
  "generationTime": "5.7s"
}
```

---

### Verify Proof Size

```bash
curl -s -X POST http://localhost:3001/api/precomputes \
  -H "Content-Type: application/json" \
  -d '{"noteId":"0xaaa...","maxAmountUsd":"1.00"}' \
  | jq -r '.precomputes[0].proof | length'
```

Expected: `9094` (4547 bytes × 2 + 2 for "0x")

---

### Check Public Inputs

```bash
curl -s -X POST http://localhost:3001/api/precomputes \
  -H "Content-Type: application/json" \
  -d '{"noteId":"0xaaa...","maxAmountUsd":"1.00"}' \
  | jq -r '.precomputes[0].publicInputs | length'
```

Expected: `4`

---

### Verify Circuit Compilation

```bash
cd demo/lib/precompute-circuit
nargo check

# Should output:
# Constraint system successfully built!
```

---

### Check Witness Files

```bash
ls -lah demo/lib/precompute-circuit/target/

# Should see:
# precompute_circuit.json (compiled circuit)
# *.gz files (witness files, may be temporary)
```

---

### Test Barretenberg

```bash
bb --version

# Should output:
# barretenberg 0.8.0 (or similar)
```

---

### Monitor Backend Logs

```bash
cd demo/mock-backend
npm start

# Watch for:
# 🚀 Mock Backend Server running on http://localhost:3001
#    Real ZK proof generation: ENABLED
#    SDK: INSTALLED
```

---

### Check Frontend Logs

Open browser console (F12) and look for:
```
📦 Stored precomputes with proofs and public inputs: 17
✅ Real ZK precomputes generated!
```

---

### Verify Network Connection

```bash
# Check backend
nc -zv localhost 3001

# Check frontend
nc -zv localhost 3000

# Expected: "Connection to localhost port 3001 [tcp] succeeded!"
```

---

### Clear All Temporary Files

```bash
# Clean circuit artifacts
cd demo/lib/precompute-circuit
rm -rf target/*.gz
rm -rf target/*.toml
rm -f proof_*.toml

# Clean backend cache (if any)
cd ../../mock-backend
rm -rf node_modules/.cache

# Restart services
npm start
```

---

## Advanced Debugging

### Enable Verbose Logging

**Backend**:
```bash
# In demo/mock-backend/.env
LOG_LEVEL=debug

# Restart
npm start
```

**Frontend**:
```typescript
// In X402SubscriptionsDemo.tsx
console.log('🔧 Debug info:', {
  precomputes,
  noteId,
  amount,
  chainId
});
```

---

### Inspect ZK Witness

```bash
cd demo/lib/precompute-circuit

# After proof generation, check witness file
cat proof_1.toml

# Should show:
# privkey = "..."
# amount = "100"
# public_amount = "..."
# etc.
```

---

### Test Circuit Manually

```bash
cd demo/lib/precompute-circuit

# Create test witness
cat > Prover.toml << 'EOF'
privkey = "12345"
amount = "100"
public_amount = "..."
# ... other fields
EOF

# Execute
nargo execute

# Prove
bb prove -b target/precompute_circuit.json -w target/precompute_circuit.gz

# Should succeed without errors
```

---

### Profile Proof Generation

```bash
# Add timing logs in zkProver.ts
const start = Date.now();

// ... proof generation ...

const end = Date.now();
console.log(`Proof generated in ${end - start}ms`);
```

---

## Still Having Issues?

### Collect Debug Information

Run this script to collect debug info:

```bash
#!/bin/bash

echo "=== System Info ===="
node --version
npm --version
nargo --version
bb --version

echo -e "\n=== Backend Health ===="
curl -s http://localhost:3001/health | jq || echo "Backend not responding"

echo -e "\n=== Frontend Status ===="
curl -s -I http://localhost:3000 | head -5 || echo "Frontend not responding"

echo -e "\n=== Circuit Status ===="
ls -lah demo/lib/precompute-circuit/target/ 2>&1 || echo "Circuit not compiled"

echo -e "\n=== Port Usage ===="
lsof -ti:3000,3001 || echo "No processes on ports 3000-3001"

echo -e "\n=== Recent Errors ===="
tail -50 demo/mock-backend/npm-debug.log 2>&1 || echo "No backend logs"
```

### Get Help

1. **Check existing issues**: [GitHub Issues](https://github.com/BermudaBay/baanx/issues)
2. **Ask on Discord**: [Bermuda Bay Community](https://discord.gg/bermudabay)
3. **Email support**: support@bermudabay.io

When reporting issues, include:
- Error message (full stack trace)
- System info (OS, Node version, etc.)
- Steps to reproduce
- Debug info from script above

---

**Last Updated**: November 1, 2024

**Version**: 1.0.0



