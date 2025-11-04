# How to Access the Private Balance Flow UI

## 🎉 Server is Running!

The Private Balance Flow UI is now running and accessible at:

**http://localhost:4193**

---

##  Quick Access

1. Open your browser
2. Navigate to: **http://localhost:4193**
3. You'll see the "Private Balance Flow" interface

---

## What You'll See

The UI simulates the complete PPOI flow with these steps:

1. **Wallet Connection** - Connect your MetaMask wallet
2. **Create Deposit** - Generate a shielded deposit transaction
3. **Generate ZK Proof** - Create a zero-knowledge proof for the deposit
4. **PPOI Verification** - Verify compliance without revealing your identity

---

## Testing the Flow

### Prerequisites

Before testing, ensure you have:

1. **Anvil Running** (local Ethereum node):
   ```bash
   # In a separate terminal
   cd /Users/0xblockbird/Cursor/Bermuda/baanx/demo
   anvil
   ```

2. **MetaMask Configured**:
   - Network: Localhost 8545
   - Import Anvil test account (private key in `.env.demo` file)

### Step-by-Step Test

1. **Open the UI**: http://localhost:4193

2. **Connect Wallet**: 
   - Click on the wallet connection step
   - Connect your MetaMask to localhost:8545

3. **Create Deposit**:
   - The UI will prepare a test deposit
   - You'll see the deposit amount and shielded address

4. **Generate Proof**:
   - The system will create a real ZK proof using Noir + Barretenberg
   - This may take a few seconds

5. **Verify PPOI**:
   - The system will verify your compliance status
   - You'll see a success message if everything is correct

---

## Stopping the Server

The server is running in the background. To stop it:

```bash
# Find the process ID
lsof -ti:4193

# Kill the process
kill $(lsof -ti:4193)
```

---

## Restarting the Server

If you need to restart:

```bash
cd /Users/0xblockbird/Cursor/Bermuda/baanx/demo/ui
npm run start
```

---

## Troubleshooting

### Port Already in Use

If you see "Port 4193 is already in use":
- The server is already running! Just open http://localhost:4193
- Or stop the existing server: `kill $(lsof -ti:4193)`

### Cannot Connect to Wallet

- Make sure MetaMask is installed
- Check that you're connected to localhost:8545
- Ensure Anvil is running

### ZK Proof Generation Fails

- Check that all dependencies are installed: `npm install` in `/demo/ui`
- Ensure the SDK is built: `cd lib/sdk && npm run build`

---

## Next Steps

Once you've tested the basic flow:

1. Try different test addresses
2. Test with malicious addresses (OFAC-listed)
3. Verify the ZK proofs are real (check console logs)
4. Integrate with your own compliance rules

---

**Enjoy testing the Private Balance Flow! 🚀**

