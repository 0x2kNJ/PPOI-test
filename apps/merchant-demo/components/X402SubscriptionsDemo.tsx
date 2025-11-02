import { useState, useEffect, useCallback, useRef } from "react";
import { ethers } from "ethers";

declare global {
  interface Window {
    ethereum?: any;
  }
}

interface Subscription {
  id: string;
  merchantName: string;
  merchantAddress: string;
  amount: string;
  interval: string;
  active: boolean;
  nextChargeDate: string;
  lastChargedDate: string | null;
}

export default function X402SubscriptionsDemo() {
  const [connected, setConnected] = useState(false);
  const [userAddress, setUserAddress] = useState("");
  const [chainId, setChainId] = useState(0);
  
  // Subscription setup
  const [amount, setAmount] = useState("10.00");
  
  // Precompute / permit state
  const [noteId, setNoteId] = useState("");
  const [permitSignature, setPermitSignature] = useState("");
  const [precomputeReady, setPrecomputeReady] = useState(false);
  const [permitSigned, setPermitSigned] = useState(false);
  const [firstPaymentSettled, setFirstPaymentSettled] = useState(false);
  
  // Store precomputes with proofs and public inputs
  const [precomputes, setPrecomputes] = useState<Array<{
    bucketAmount: number;
    proof: string;
    publicInputs: string[];
  }>>([]);
  
  // Subscription policy
  const [subscriptionPolicy, setSubscriptionPolicy] = useState(true);
  const [showPrecomputesDetails, setShowPrecomputesDetails] = useState(false);
  
  // Subscriptions list
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  
  // Status
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Auto-recurring payment state (12 monthly payments simulated at 10 seconds each)
  const [autoPayEnabled, setAutoPayEnabled] = useState(false);
  const [paymentsCompleted, setPaymentsCompleted] = useState(0);
  const [countdown, setCountdown] = useState(10);
  const [paymentHistory, setPaymentHistory] = useState<Array<{
    paymentNumber: number;
    timestamp: number;
    txHash: string;
    amount: string;
  }>>([]);
  const [activeSubscriptionId, setActiveSubscriptionId] = useState<string | null>(null);
  
  // Transaction confirmation details
  const [lastTransaction, setLastTransaction] = useState<{
    txHash: string;
    amount: string;
    timestamp: number;
    blockNumber?: number;
    status: 'success' | 'pending' | 'failed';
  } | null>(null);

  const ADAPTER_ADDR = process.env.NEXT_PUBLIC_X402_ADAPTER || "";
  const RELAYER_URL = process.env.NEXT_PUBLIC_RELAYER_URL || "/api/execute";

  // Ref to track when payment should be triggered
  const shouldTriggerPayment = useRef(false);

  // Auto-payment handler (defined early so it can be used in timer effect)
  const handleAutoPayment = useCallback(async () => {
    console.log(`💳 handleAutoPayment called. activeSubscriptionId=${activeSubscriptionId}, paymentsCompleted=${paymentsCompleted}`);
    
    if (!activeSubscriptionId || paymentsCompleted >= 12) {
      console.log("❌ Stopping: no activeSubscriptionId or paymentsCompleted >= 12");
      setAutoPayEnabled(false);
      return;
    }

    console.log(`💳 Processing payment ${paymentsCompleted + 1}/12...`);

    try {
      console.log(`📤 Sending payment request for subscriptionId: ${activeSubscriptionId}`);
      
      const res = await fetch("/api/subscription", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId: activeSubscriptionId }),
      });

      console.log(`📡 API response status: ${res.status}`);

      if (!res.ok) {
        const errorData = await res.json();
        console.error("❌ Auto-payment failed:", errorData);
        console.error("❌ Subscription ID being sent:", activeSubscriptionId);
        console.error("❌ This might happen if the Next.js server restarted (clears in-memory storage)");
        console.error("❌ Solution: Create a new subscription");
        return;
      }

      const data = await res.json();
      
      console.log(`✅ Payment ${paymentsCompleted + 1}/12 successful! TX: ${data.txHash}`);
      
      // Record payment in history
      const newPayment = {
        paymentNumber: paymentsCompleted + 1,
        timestamp: Date.now(),
        txHash: data.txHash,
        amount: amount, // Use amount from state instead of sub
      };
      
      setPaymentHistory(prev => [...prev, newPayment]);
      setPaymentsCompleted(prev => prev + 1);
      
      // Update last transaction for confirmation box
      setLastTransaction({
        txHash: data.txHash,
        amount: amount,
        timestamp: Date.now(),
        status: 'success'
      });

      // Reset countdown for next payment
      console.log(`🔄 Resetting countdown to 10s`);
      setCountdown(10);

      // Stop auto-pay if we've completed 12 payments
      if (paymentsCompleted + 1 >= 12) {
        console.log("🎉 All 12 payments completed!");
        setAutoPayEnabled(false);
        setStatus("🎉 All 12 payments completed! Subscription fulfilled.");
      }
    } catch (error: any) {
      console.error("❌ Auto-payment error:", error);
      console.error("Error stack:", error.stack);
    }
  }, [activeSubscriptionId, paymentsCompleted, amount]);

  // Countdown timer for auto-recurring payments (10 seconds = 1 "month")
  useEffect(() => {
    if (!autoPayEnabled || paymentsCompleted >= 12 || !activeSubscriptionId) {
      console.log("⏸️ Timer stopped: autoPayEnabled=", autoPayEnabled, "paymentsCompleted=", paymentsCompleted, "activeSubscriptionId=", activeSubscriptionId);
      return;
    }

    console.log("⏱️ Timer effect running");

    const interval = setInterval(() => {
      setCountdown((prev) => {
        console.log(`⏰ Timer tick: ${prev}s → ${prev - 1}s`);
        
        if (prev <= 1) {
          console.log("⚡ Countdown reached 0! Setting trigger flag...");
          // Set ref to trigger payment in separate effect
          shouldTriggerPayment.current = true;
          return 10; // Reset countdown immediately
        }
        return prev - 1;
      });
    }, 1000); // Update every second

    return () => {
      console.log("🧹 Cleaning up timer interval");
      clearInterval(interval);
    };
  }, [autoPayEnabled, paymentsCompleted, activeSubscriptionId]);

  // Watch for trigger flag and process payment
  useEffect(() => {
    if (shouldTriggerPayment.current && autoPayEnabled && activeSubscriptionId && paymentsCompleted < 12) {
      console.log("🚀 Trigger flag detected! Processing payment...");
      shouldTriggerPayment.current = false; // Reset flag
      handleAutoPayment();
    }
  }, [countdown, autoPayEnabled, activeSubscriptionId, paymentsCompleted, handleAutoPayment]);

  // Trigger payment when countdown hits 0 (backup safety check)
  useEffect(() => {
    console.log(`⏰ Countdown effect fired: countdown=${countdown}, autoPayEnabled=${autoPayEnabled}, activeSubscriptionId=${activeSubscriptionId}, paymentsCompleted=${paymentsCompleted}`);
    
    if (countdown === 0 && autoPayEnabled && activeSubscriptionId && paymentsCompleted < 12) {
      console.log("🚀 Triggering auto-payment...");
      handleAutoPayment();
    }
  }, [countdown, autoPayEnabled, activeSubscriptionId, paymentsCompleted, handleAutoPayment]);

  // Connect wallet
  async function handleConnect() {
    if (!window.ethereum) {
      alert("Please install MetaMask!");
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      
      // Request permissions first (fixes "not authorized" error)
      await window.ethereum.request({
        method: 'wallet_requestPermissions',
        params: [{
          eth_accounts: {}
        }]
      });
      
      const accounts = await provider.send("eth_requestAccounts", []);
      const network = await provider.getNetwork();
      
      const expectedChainId = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "31337");
      const actualChainId = Number(network.chainId);
      
      // Check if connected to correct network
      if (actualChainId !== expectedChainId) {
        setStatus(`Wrong network! Please switch to chainId ${expectedChainId} (currently ${actualChainId})`);
        
        // Try to switch network
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: `0x${expectedChainId.toString(16)}` }],
          });
          // Reload after switch
          window.location.reload();
        } catch (switchError: any) {
          // Network doesn't exist, add it
          if (switchError.code === 4902) {
            try {
              await window.ethereum.request({
                method: "wallet_addEthereumChain",
                params: [{
                  chainId: `0x${expectedChainId.toString(16)}`,
                  chainName: "Local Anvil",
                  nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
                  rpcUrls: ["http://localhost:8545"],
                }],
              });
              window.location.reload();
            } catch (addError) {
              setStatus(`Please add network manually: Chain ID ${expectedChainId}, RPC http://localhost:8545`);
            }
          }
        }
        return;
      }
      
      setUserAddress(accounts[0]);
      setChainId(actualChainId);
      setConnected(true);
      setStatus("Connected!");
      
      // Load subscriptions
      loadSubscriptions(accounts[0]);
    } catch (error) {
      console.error("Connect error:", error);
      setStatus("Connection failed");
    }
  }

  // Load user subscriptions
  async function loadSubscriptions(address: string) {
    try {
      const res = await fetch(`/api/subscription?userAddress=${address}`);
      const data = await res.json();
      setSubscriptions(data.subscriptions || []);
    } catch (error) {
      console.error("Load subscriptions error:", error);
    }
  }

  // Generate precompute + permit
  async function handleSubscribe() {
    if (!connected || !amount) {
      setStatus("Please connect wallet and enter amount");
      return;
    }

    try {
      setLoading(true);
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // Generate noteId
      const newNoteId = ethers.solidityPackedKeccak256(
        ["address", "uint256"],
        [userAddress, Date.now()]
      );
      setNoteId(newNoteId);

      // Using truncated ladder for $1,000 max (17 buckets)
      // For 12 months: maxAmount = amount * 12
      const amountWei = ethers.parseUnits(amount, 6);
      const maxAmountWei = amountWei * BigInt(12);
      
      // Permit expires in 1 year
      const expiry = Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60);
      const nonce = Date.now();

      // Get merchant address (use env or user's address as fallback)
      const merchantAddress = process.env.NEXT_PUBLIC_MERCHANT || userAddress;
      
      // Validate addresses
      if (!ethers.isAddress(ADAPTER_ADDR) || ADAPTER_ADDR === "" || !ethers.isAddress(merchantAddress)) {
        throw new Error("Invalid contract address. Please configure NEXT_PUBLIC_X402_ADAPTER and NEXT_PUBLIC_MERCHANT in .env.local");
      }

      // Step 1: Generate REAL ZK precomputes
      setStatus("⚡ Generating real ZK precomputes (17 buckets)...");
      console.log("🔧 Generating REAL ZK precomputes for noteId:", newNoteId);
      
      // Call API to generate real ZK proofs
      const maxAmountUsd = (Number(amount) * 12).toFixed(2); // 12 months
      
      const precomputeRes = await fetch("/api/precomputes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          noteId: newNoteId,
          maxAmountUsd: maxAmountUsd,
        }),
      });

      if (!precomputeRes.ok) {
        const error = await precomputeRes.json();
        throw new Error(error.error || "Failed to generate precomputes");
      }

      const precomputeData = await precomputeRes.json();
      
      console.log("✅ Real ZK precomputes generated!", precomputeData.stats);
      console.log("📦 Precomputes with proofs:", precomputeData.precomputes);
      
      // Store precomputes with proofs and public inputs
      const precomputeList = precomputeData.precomputes.map((p: any) => ({
        bucketAmount: p.bucketAmount,
        proof: p.proof || "", // Proof bytes for on-chain verification
        publicInputs: p.publicInputs || [], // Public inputs from witness: [root, public_amount, ext_data_hash, nullifier]
      }));
      
      setPrecomputes(precomputeList);
      console.log("📦 Stored precomputes with proofs and public inputs:", precomputeList.length);
      setStatus(
        `✅ Generated ${precomputeData.stats.total} precomputes ` +
        `(${precomputeData.stats.realProofs} real ZK proofs, ${precomputeData.stats.mockProofs} mock)`
      );
      
      setPrecomputeReady(true);

      // Step 2: Sign permit
      setStatus("📝 Please sign the permit in MetaMask...");
      
      // Use env chainId as fallback if wallet chainId doesn't match
      const domainChainId = chainId || parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "31337");
      
      // EIP-712 domain and types
      const domain = {
        name: "Bermuda X402",
        version: "1",
        chainId: domainChainId,
        verifyingContract: ADAPTER_ADDR,
      };

      const types = {
        Permit: [
          { name: "noteId", type: "bytes32" },
          { name: "merchant", type: "address" },
          { name: "maxAmount", type: "uint256" },
          { name: "expiry", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "merchantCommitment", type: "bytes32" },
        ],
      };

      // Sign permit - MetaMask should prompt automatically
      // If authorization error occurs, it will be caught in the outer try/catch
      setStatus("📝 Waiting for MetaMask signature... Please approve the signature request.");
      
      const signature = await signer.signTypedData(domain, types, {
        noteId: newNoteId,
        merchant: merchantAddress,
        maxAmount: maxAmountWei,
        expiry: BigInt(expiry),
        nonce: BigInt(nonce),
        merchantCommitment: (process.env.NEXT_PUBLIC_MERCHANT_COMMITMENT || "0x0000000000000000000000000000000000000000000000000000000000000000") as `0x${string}`, // Shielded address if configured, else public
      });

      setPermitSignature(signature);
      setPermitSigned(true);
      console.log("✅ Permit signed!");

      // Step 3: Create subscription & execute first payment
      setStatus("💳 Creating subscription & processing first payment...");
      await handleCreateSubscription(signature, newNoteId, maxAmountWei.toString(), expiry, nonce, precomputeList);
      
    } catch (error: any) {
      console.error("Subscribe error:", error);
      if (error.code === 4001) {
        setStatus("❌ Signature rejected by user");
      } else if (error.code === 4100 || error.message?.includes('not authorized')) {
        setStatus("❌ MetaMask authorization failed. Try these steps:\n1. Click 'Reconnect' button\n2. In MetaMask: Settings → Connected Sites → Remove this site\n3. Refresh page and reconnect");
      } else {
        setStatus(`❌ Error: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
    }
  }

  // Charge subscription (execute payment)
  async function handleChargeSubscription(subscriptionId: string) {
    try {
      setLoading(true);
      setStatus("Processing payment...");

      const res = await fetch("/api/subscription", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to charge subscription");
      }

      const data = await res.json();
      
      // Find subscription to get amount
      const subscription = subscriptions.find(s => s.id === subscriptionId);
      
      // Store transaction details for confirmation display
      setLastTransaction({
        txHash: data.txHash,
        amount: subscription?.amount || amount,
        timestamp: Date.now(),
        status: 'success'
      });
      
      setStatus(`✅ Payment successful! TX: ${data.txHash.slice(0, 10)}...`);
      
      // Reload subscriptions to update UI
      loadSubscriptions(userAddress);
      
      console.log("✅ Charge successful:", data);
    } catch (error: any) {
      console.error("Charge error:", error);
      setStatus(`❌ Error: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }

  // Create subscription
  async function handleCreateSubscription(
    signature: string,
    noteIdValue: string,
    maxAmountValue: string,
    expiry: number,
    nonce: number,
    precomputesList?: typeof precomputes // Optional parameter with precomputes to avoid race condition
  ) {
    try {
      const amountWei = ethers.parseUnits(amount, 6).toString();
      const merchantAddress = process.env.NEXT_PUBLIC_MERCHANT || userAddress;
      
      // Validate merchant address
      if (!ethers.isAddress(merchantAddress)) {
        throw new Error("Invalid merchant address");
      }

      // Use passed precomputes or fall back to state
      const availablePrecomputes = precomputesList || precomputes;
      
      // Find a precompute that matches the subscription amount (or use first one)
      // For monthly subscription, we'll use the first precompute for now
      // In production, you'd match the bucket amount to the subscription amount
      console.log(`🔍 Looking for precompute. Available: ${availablePrecomputes.length}`);
      
      if (availablePrecomputes.length === 0) {
        console.error("❌ No precomputes available! This means generation failed or page was refreshed.");
        throw new Error("No precomputes available. Please refresh the page and try subscribing again.");
      }
      
      const matchingPrecompute = availablePrecomputes.find(p => p.bucketAmount >= parseFloat(amount) * 100) || availablePrecomputes[0];
      
      if (!matchingPrecompute || !matchingPrecompute.proof || !matchingPrecompute.publicInputs || matchingPrecompute.publicInputs.length !== 4) {
        console.error("❌ Invalid precompute:", {
          hasPrecompute: !!matchingPrecompute,
          hasProof: !!matchingPrecompute?.proof,
          proofLength: matchingPrecompute?.proof?.length,
          hasPublicInputs: !!matchingPrecompute?.publicInputs,
          publicInputsLength: matchingPrecompute?.publicInputs?.length,
        });
        throw new Error("Invalid precompute data. Please refresh the page and try subscribing again.");
      }
      
      console.log(`✅ Using precompute: bucketAmount=${matchingPrecompute.bucketAmount}, proofLength=${matchingPrecompute.proof.length}`);
      
      const res = await fetch("/api/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchantName: "Subscription Service",
          merchantAddress,
          userAddress,
          amount: amountWei,
          interval: "monthly",
          noteId: noteIdValue,
          permitSignature: signature,
          maxAmount: maxAmountValue,
          expiry,
          nonce,
          proof: matchingPrecompute.proof,
          publicInputs: matchingPrecompute.publicInputs, // Pass actual public inputs from witness
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create subscription");
      }

      const data = await res.json();
      const subscriptionId = data.subscriptionId;
      
      // Immediately execute first payment
      setStatus("⚡ Processing first payment via relayer...");
      
      try {
        const chargeRes = await fetch("/api/subscription", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscriptionId }),
        });

        if (!chargeRes.ok) {
          const chargeError = await chargeRes.json();
          throw new Error(chargeError.error || "First payment failed");
        }

        const chargeData = await chargeRes.json();
        
        // Store transaction details for confirmation display
        setLastTransaction({
          txHash: chargeData.txHash,
          amount: amount,
          timestamp: Date.now(),
          status: 'success'
        });
        
        // Record first payment in history
        setPaymentHistory([{
          paymentNumber: 1,
          timestamp: Date.now(),
          txHash: chargeData.txHash,
          amount: amount,
        }]);
        setPaymentsCompleted(1);
        
        // Enable auto-recurring payments (10 seconds per payment)
        setActiveSubscriptionId(subscriptionId);
        setAutoPayEnabled(true);
        setCountdown(10); // Start 10-second countdown
        
        setStatus(`✅ Payment 1/12 completed!\n💰 Transaction: ${chargeData.txHash}\n⏰ Auto-payments enabled: Next payment in 10 seconds...`);
        setFirstPaymentSettled(true);
      } catch (chargeError: any) {
        console.error("First payment error:", chargeError);
        setStatus(`⚠️ Subscription created but first payment failed: ${chargeError.message}\nYou can manually charge from the subscription list.`);
      }
      
      // Reload subscriptions
      loadSubscriptions(userAddress);
    } catch (error: any) {
      console.error("Create subscription error:", error);
      setStatus(`Error: ${error.message}`);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: "#1a1a1a",
      color: "#ffffff",
      padding: "2rem",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    }}>
      <div style={{ maxWidth: "600px", margin: "0 auto" }}>
        {/* Header with Wallet Status */}
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center",
          marginBottom: "1.5rem"
        }}>
          <div>
            <h1 style={{
              fontSize: "2rem",
              fontWeight: "bold",
              marginBottom: "0.25rem",
              color: "#ffffff",
            }}>
              x402-based Private Subscriptions
            </h1>
            <p style={{
              fontSize: "0.95rem",
              color: "#a0a0a0",
              marginBottom: 0,
            }}>
              Private, gasless, and merchant-bound pull-payments using Bermuda.
            </p>
          </div>
          
          {/* Wallet Connection Status */}
          <div>
            {!connected ? (
              <button
                onClick={handleConnect}
                style={{
                  padding: "0.75rem 1.5rem",
                  fontSize: "0.95rem",
                  backgroundColor: "#3b82f6",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "600",
                  whiteSpace: "nowrap",
                  boxShadow: "0 2px 8px rgba(59, 130, 246, 0.3)",
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#2563eb"}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#3b82f6"}
              >
                🔌 Connect Wallet
              </button>
            ) : (
              <div style={{ textAlign: "right" }}>
                <div style={{
                  fontSize: "0.75rem",
                  color: "#22c55e",
                  marginBottom: "0.25rem",
                  fontWeight: "600",
                }}>
                  ✓ Connected
                </div>
                <div style={{
                  fontSize: "0.85rem",
                  color: "#a0a0a0",
                  fontFamily: "monospace",
                }}>
                  {userAddress.slice(0, 6)}...{userAddress.slice(-4)}
                </div>
                <button
                  onClick={handleConnect}
                  style={{
                    marginTop: "0.5rem",
                    padding: "0.375rem 0.75rem",
                    fontSize: "0.75rem",
                    backgroundColor: "transparent",
                    color: "#6b7280",
                    border: "1px solid #3a3a3a",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontWeight: "500",
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.borderColor = "#6b7280";
                    e.currentTarget.style.color = "#ffffff";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.borderColor = "#3a3a3a";
                    e.currentTarget.style.color = "#6b7280";
                  }}
                >
                  Reconnect
                </button>
              </div>
            )}
          </div>
        </div>

        <div style={{
          width: "100%",
          height: "1px",
          backgroundColor: "#2a2a2a",
          marginBottom: "2rem",
        }} />

        {connected && (
          <>
            {/* Subscription Fee Input */}
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{
                display: "block",
                fontSize: "0.95rem",
                color: "#ffffff",
                marginBottom: "0.75rem",
              }}>
                Monthly Subscription Fee (USDC)
              </label>
              <input
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.875rem",
                  fontSize: "1rem",
                  backgroundColor: "#2a2a2a",
                  color: "#ffffff",
                  border: "1px solid #3a3a3a",
                  borderRadius: "8px",
                  outline: "none",
                }}
              />
            </div>

            {/* Subscribe Button */}
            <button
              onClick={handleSubscribe}
              disabled={loading || firstPaymentSettled}
              style={{
                width: "100%",
                padding: "1rem",
                fontSize: "1.1rem",
                fontWeight: "600",
                backgroundColor: loading || firstPaymentSettled ? "#4a4a4a" : "#1e40af",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: loading || firstPaymentSettled ? "not-allowed" : "pointer",
                marginBottom: "2rem",
              }}
            >
              {loading ? "Processing..." : firstPaymentSettled ? "Subscription Active" : "Subscribe for 12 months"}
            </button>

            {/* Status Checklist */}
            <div style={{
              backgroundColor: "#2a2a2a",
              borderRadius: "8px",
              padding: "1.5rem",
              marginBottom: "2rem",
            }}>
              <div style={{ marginBottom: "1rem", display: "flex", alignItems: "center" }}>
                <span style={{ color: connected ? "#22c55e" : "#6b7280", marginRight: "0.75rem", fontSize: "1.25rem" }}>✓</span>
                <span style={{ color: "#ffffff" }}>Successfully connected to a wallet</span>
              </div>
              <div style={{ marginBottom: "1rem", display: "flex", alignItems: "center" }}>
                <span style={{ color: precomputeReady ? "#22c55e" : "#6b7280", marginRight: "0.75rem", fontSize: "1.25rem" }}>✓</span>
                <span style={{ color: "#ffffff" }}>Precomputes ready</span>
              </div>
              <div style={{ marginBottom: "1rem", display: "flex", alignItems: "center" }}>
                <span style={{ color: permitSigned ? "#22c55e" : "#6b7280", marginRight: "0.75rem", fontSize: "1.25rem" }}>✓</span>
                <span style={{ color: "#ffffff" }}>Permit signed</span>
              </div>
              <div style={{ display: "flex", alignItems: "center" }}>
                <span style={{ color: firstPaymentSettled ? "#22c55e" : "#6b7280", marginRight: "0.75rem", fontSize: "1.25rem" }}>✓</span>
                <span style={{ color: "#ffffff" }}>First monthly payment settled</span>
              </div>
            </div>

            {/* Subscription Policy Toggle */}
            <div style={{
              backgroundColor: "#2a2a2a",
              borderRadius: "8px",
              padding: "1.5rem",
              marginBottom: "1rem",
            }}>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1rem",
              }}>
                <span style={{ color: "#ffffff", fontSize: "1rem", fontWeight: "500" }}>
                  Subscription Policy
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span style={{ color: "#ffffff", fontSize: "0.9rem" }}>
                    {subscriptionPolicy ? "Active" : "Inactive"}
                  </span>
                  <div
                    onClick={() => setSubscriptionPolicy(!subscriptionPolicy)}
                    style={{
                      width: "50px",
                      height: "28px",
                      backgroundColor: subscriptionPolicy ? "#22c55e" : "#6b7280",
                      borderRadius: "14px",
                      cursor: "pointer",
                      position: "relative",
                      transition: "background-color 0.2s",
                    }}
                  >
                    <div style={{
                      width: "24px",
                      height: "24px",
                      backgroundColor: "#ffffff",
                      borderRadius: "50%",
                      position: "absolute",
                      top: "2px",
                      left: subscriptionPolicy ? "24px" : "2px",
                      transition: "left 0.2s",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                    }} />
                  </div>
                </div>
              </div>

              {/* Expandable Precomputes & Permit Section */}
              <div
                onClick={() => setShowPrecomputesDetails(!showPrecomputesDetails)}
                style={{
                  backgroundColor: "#1a1a1a",
                  borderRadius: "6px",
                  padding: "1rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                }}
              >
                <span style={{
                  color: "#a0a0a0",
                  fontSize: "1.2rem",
                  transform: showPrecomputesDetails ? "rotate(90deg)" : "rotate(0deg)",
                  transition: "transform 0.2s",
                }}>
                  &gt;
                </span>
                <span style={{ color: "#a0a0a0", fontSize: "0.9rem" }}>
                  Precomputes & Permit
                </span>
              </div>

              {showPrecomputesDetails && (
                <div style={{
                  marginTop: "1rem",
                  padding: "1rem",
                  backgroundColor: "#1a1a1a",
                  borderRadius: "6px",
                  fontSize: "0.85rem",
                  color: "#a0a0a0",
                }}>
                  <div style={{ marginBottom: "0.5rem" }}>
                    <strong style={{ color: "#ffffff" }}>Note ID:</strong> {noteId.slice(0, 20)}...
                  </div>
                  <div style={{ marginBottom: "0.5rem" }}>
                    <strong style={{ color: "#ffffff" }}>Max Amount:</strong> ${ethers.formatUnits((BigInt(Math.floor(parseFloat(amount) * 1000000)) * BigInt(12)), 6)}
                  </div>
                  <div style={{ marginBottom: "0.5rem" }}>
                    <strong style={{ color: "#ffffff" }}>Buckets:</strong> 14 (truncated ladder for $120)
                  </div>
                  <div>
                    <strong style={{ color: "#ffffff" }}>Permit:</strong> {permitSignature ? `${permitSignature.slice(0, 20)}...` : "Not signed"}
                  </div>
                </div>
              )}
            </div>

            {/* Active Subscriptions */}
            {subscriptions.length > 0 && (
              <div style={{
                backgroundColor: "#2a2a2a",
                borderRadius: "8px",
                padding: "1.5rem",
              }}>
                <h2 style={{
                  fontSize: "1.25rem",
                  fontWeight: "600",
                  marginBottom: "1rem",
                  color: "#ffffff",
                }}>
                  Active Subscriptions
                </h2>
                {subscriptions.map((sub) => {
                  const nextChargeDate = new Date(sub.nextChargeDate);
                  const canCharge = nextChargeDate <= new Date();
                  const isOverdue = nextChargeDate < new Date(Date.now() - 24 * 60 * 60 * 1000); // Over 24h overdue
                  
                  return (
                  <div
                    key={sub.id}
                    style={{
                      padding: "1rem",
                      marginBottom: "0.75rem",
                      backgroundColor: "#1a1a1a",
                      borderRadius: "6px",
                      fontSize: "0.9rem",
                    }}
                  >
                    <div style={{ 
                      color: "#ffffff", 
                      marginBottom: "0.5rem",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}>
                      <span style={{ fontWeight: "500" }}>
                        ${ethers.formatUnits(sub.amount, 6)} / {sub.interval}
                      </span>
                      {canCharge && (
                        <button
                          onClick={() => handleChargeSubscription(sub.id)}
                          disabled={loading}
                          style={{
                            padding: "0.5rem 1rem",
                            fontSize: "0.85rem",
                            backgroundColor: isOverdue ? "#dc2626" : "#1e40af",
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            cursor: loading ? "not-allowed" : "pointer",
                            fontWeight: "500",
                            opacity: loading ? 0.6 : 1,
                          }}
                          onMouseOver={(e) => {
                            if (!loading) {
                              e.currentTarget.style.backgroundColor = isOverdue ? "#b91c1c" : "#1e3a8a";
                            }
                          }}
                          onMouseOut={(e) => {
                            if (!loading) {
                              e.currentTarget.style.backgroundColor = isOverdue ? "#dc2626" : "#1e40af";
                            }
                          }}
                        >
                          {loading ? "Processing..." : "Charge Now"}
                        </button>
                      )}
                    </div>
                    <div style={{ color: "#a0a0a0", fontSize: "0.85rem", marginTop: "0.25rem" }}>
                      <div>Next charge: {nextChargeDate.toLocaleDateString()}</div>
                      {sub.lastChargedDate && (
                        <div style={{ marginTop: "0.25rem" }}>
                          Last charged: {new Date(sub.lastChargedDate).toLocaleDateString()}
                        </div>
                      )}
                      {isOverdue && (
                        <div style={{ color: "#dc2626", marginTop: "0.25rem", fontWeight: "500" }}>
                          ⚠️ Overdue
                        </div>
                      )}
                      {!canCharge && (
                        <div style={{ color: "#6b7280", marginTop: "0.25rem", fontSize: "0.8rem" }}>
                          Scheduled
                        </div>
                      )}
                    </div>
                  </div>
                );
                })}
              </div>
            )}

            {/* Confirmation */}
            {lastTransaction && (
              <div style={{
                backgroundColor: "#2a2a2a",
                borderRadius: "8px",
                padding: "1.5rem",
                marginTop: "1rem",
              }}>
                <h2 style={{
                  fontSize: "1.25rem",
                  fontWeight: "600",
                  marginBottom: "1rem",
                  color: "#ffffff",
                }}>
                  Confirmation
                </h2>
                
                <div style={{
                  padding: "1rem",
                  marginBottom: "0.75rem",
                  backgroundColor: "#1a1a1a",
                  borderRadius: "6px",
                }}>
                  <div style={{ 
                    color: "#22c55e", 
                    marginBottom: "1rem",
                    fontSize: "0.95rem",
                    fontWeight: "500",
                  }}>
                    ✓ Payment Successful - On-Chain Proof
                  </div>
                  
                  <div style={{ marginBottom: "0.75rem" }}>
                    <div style={{ color: "#a0a0a0", fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                      Transaction Hash
                    </div>
                    <div style={{ 
                      color: "#ffffff", 
                      fontSize: "0.9rem",
                      fontFamily: "monospace",
                      wordBreak: "break-all",
                    }}>
                      {lastTransaction.txHash}
                    </div>
                  </div>

                  <div style={{ marginBottom: "0.75rem" }}>
                    <div style={{ color: "#a0a0a0", fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                      Amount
                    </div>
                    <div style={{ color: "#ffffff", fontSize: "0.9rem" }}>
                      ${lastTransaction.amount} USDC
                    </div>
                  </div>

                  <div style={{ marginBottom: "0.75rem" }}>
                    <div style={{ color: "#a0a0a0", fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                      Time
                    </div>
                    <div style={{ color: "#ffffff", fontSize: "0.9rem" }}>
                      {new Date(lastTransaction.timestamp).toLocaleString()}
                    </div>
                  </div>

                  <div>
                    <div style={{ color: "#a0a0a0", fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                      Privacy
                    </div>
                    <div style={{ color: "#22c55e", fontSize: "0.85rem" }}>
                      ✓ Zero-Knowledge Proof Verified
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Recurring Payments Progress & Countdown Timer */}
            {autoPayEnabled && paymentsCompleted < 12 && (
              <div style={{
                backgroundColor: "#2a2a2a",
                borderRadius: "8px",
                padding: "1.5rem",
                marginTop: "1rem",
                border: "2px solid #3b82f6",
              }}>
                <h2 style={{
                  fontSize: "1.25rem",
                  fontWeight: "600",
                  marginBottom: "1rem",
                  color: "#ffffff",
                }}>
                  🔄 Auto-Recurring Payments Active
                </h2>
                
                {/* Progress */}
                <div style={{
                  padding: "1rem",
                  marginBottom: "1rem",
                  backgroundColor: "#1a1a1a",
                  borderRadius: "6px",
                }}>
                  <div style={{ 
                    color: "#a0a0a0", 
                    fontSize: "0.85rem",
                    marginBottom: "0.5rem"
                  }}>
                    Payment Progress
                  </div>
                  <div style={{ 
                    color: "#ffffff", 
                    fontSize: "1.5rem",
                    fontWeight: "700",
                    marginBottom: "0.75rem"
                  }}>
                    {paymentsCompleted} / 12 Payments Completed
                  </div>
                  
                  {/* Progress Bar */}
                  <div style={{
                    width: "100%",
                    height: "12px",
                    backgroundColor: "#333",
                    borderRadius: "6px",
                    overflow: "hidden",
                  }}>
                    <div style={{
                      width: `${(paymentsCompleted / 12) * 100}%`,
                      height: "100%",
                      backgroundColor: "#3b82f6",
                      transition: "width 0.5s ease",
                    }} />
                  </div>
                </div>

                {/* Countdown Timer */}
                <div style={{
                  padding: "1.5rem",
                  backgroundColor: "#1a1a1a",
                  borderRadius: "6px",
                  textAlign: "center",
                  marginBottom: "1rem",
                }}>
                  <div style={{ 
                    color: "#a0a0a0", 
                    fontSize: "0.85rem",
                    marginBottom: "0.75rem"
                  }}>
                    Next Payment In
                  </div>
                  <div style={{ 
                    color: "#3b82f6", 
                    fontSize: "3rem",
                    fontWeight: "700",
                    fontFamily: "monospace",
                  }}>
                    {countdown}s
                  </div>
                  <div style={{ 
                    color: "#a0a0a0", 
                    fontSize: "0.85rem",
                    marginTop: "0.5rem"
                  }}>
                    (10 seconds = 1 month)
                  </div>
                </div>

                {/* Pause/Resume Button */}
                <button
                  onClick={() => setAutoPayEnabled(false)}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    backgroundColor: "#dc2626",
                    color: "#ffffff",
                    borderRadius: "6px",
                    border: "none",
                    fontSize: "1rem",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  ⏸ Pause Auto-Payments
                </button>
              </div>
            )}

            {/* Paused State */}
            {!autoPayEnabled && paymentsCompleted > 0 && paymentsCompleted < 12 && (
              <div style={{
                backgroundColor: "#2a2a2a",
                borderRadius: "8px",
                padding: "1.5rem",
                marginTop: "1rem",
                border: "2px solid #fbbf24",
              }}>
                <h2 style={{
                  fontSize: "1.25rem",
                  fontWeight: "600",
                  marginBottom: "1rem",
                  color: "#ffffff",
                }}>
                  ⏸ Auto-Payments Paused
                </h2>
                
                <div style={{ marginBottom: "1rem", color: "#a0a0a0" }}>
                  Progress: {paymentsCompleted} / 12 payments completed
                </div>

                <button
                  onClick={() => {
                    setAutoPayEnabled(true);
                    setCountdown(10);
                  }}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    backgroundColor: "#22c55e",
                    color: "#ffffff",
                    borderRadius: "6px",
                    border: "none",
                    fontSize: "1rem",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  ▶️ Resume Auto-Payments
                </button>
              </div>
            )}

            {/* Payment History */}
            {paymentHistory.length > 0 && (
              <div style={{
                backgroundColor: "#2a2a2a",
                borderRadius: "8px",
                padding: "1.5rem",
                marginTop: "1rem",
              }}>
                <h2 style={{
                  fontSize: "1.25rem",
                  fontWeight: "600",
                  marginBottom: "1rem",
                  color: "#ffffff",
                }}>
                  📜 Payment History
                </h2>
                
                <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                  {paymentHistory.map((payment) => (
                    <div
                      key={payment.paymentNumber}
                      style={{
                        padding: "0.75rem",
                        marginBottom: "0.5rem",
                        backgroundColor: "#1a1a1a",
                        borderRadius: "6px",
                        borderLeft: "4px solid #22c55e",
                      }}
                    >
                      <div style={{ 
                        color: "#ffffff", 
                        fontSize: "0.95rem",
                        fontWeight: "600",
                        marginBottom: "0.5rem"
                      }}>
                        Payment #{payment.paymentNumber} of 12
                      </div>
                      
                      <div style={{ color: "#a0a0a0", fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                        Amount: ${payment.amount} USDC
                      </div>
                      
                      <div style={{ color: "#a0a0a0", fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                        Time: {new Date(payment.timestamp).toLocaleString()}
                      </div>
                      
                      <div style={{ 
                        color: "#a0a0a0", 
                        fontSize: "0.75rem",
                        fontFamily: "monospace",
                        wordBreak: "break-all",
                      }}>
                        TX: {payment.txHash.slice(0, 20)}...
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Status Message */}
            {status && (
              <div style={{
                marginTop: "1rem",
                padding: "1rem",
                backgroundColor: status.includes("✅") ? "#1a3a2a" : "#3a1a1a",
                borderRadius: "8px",
                color: status.includes("✅") ? "#22c55e" : "#ef4444",
                fontSize: "0.9rem",
              }}>
                {status}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
