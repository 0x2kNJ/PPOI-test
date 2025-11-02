import { useState, useEffect } from "react";
import { ethers } from "ethers";

declare global {
  interface Window {
    ethereum?: any;
  }
}

/**
 * Complete HTTP 402 Demo with Actual HTTP Calls
 * 
 * This demonstrates a real HTTP 402 Payment Required flow:
 * 1. Client makes HTTP GET to service
 * 2. Server responds with HTTP 402 + payment details
 * 3. Client pays on-chain via x402
 * 4. Client makes HTTP POST with payment proof
 * 5. Server verifies payment and returns data
 */
export default function HTTP402FullDemo() {
  const [connected, setConnected] = useState(false);
  const [userAddress, setUserAddress] = useState("");
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [city, setCity] = useState("hamburg");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  
  // HTTP 402 response data
  const [paymentRequired, setPaymentRequired] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState<{
    amount: string;
    currency: string;
    decimals: number;
    adapterAddress: string;
    instructions: any;
  } | null>(null);
  
  // Payment state
  const [txHash, setTxHash] = useState("");
  const [paying, setPaying] = useState(false);
  
  // Weather data (after payment)
  const [weather, setWeather] = useState<{
    city: string;
    temperature: number;
    condition: string;
    message: string;
  } | null>(null);
  
  // HTTP request/response logs
  const [httpLogs, setHttpLogs] = useState<Array<{
    timestamp: string;
    method: string;
    url: string;
    status: number;
    statusText: string;
    body?: any;
  }>>([]);

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask!");
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signerInstance = await provider.getSigner();
      const address = await signerInstance.getAddress();
      
      setUserAddress(address);
      setSigner(signerInstance);
      setConnected(true);
      setStatus("✅ Wallet connected");
    } catch (error: any) {
      console.error("Connection error:", error);
      setStatus(`❌ Error: ${error.message}`);
    }
  };

  const logHttpRequest = (method: string, url: string, status: number, statusText: string, body?: any) => {
    setHttpLogs(prev => [...prev, {
      timestamp: new Date().toISOString(),
      method,
      url,
      status,
      statusText,
      body: body || null
    }]);
  };

  // Step 1: HTTP GET - Request weather (will get 402)
  const makeHTTPRequest = async () => {
    if (!connected || !userAddress) {
      setStatus("❌ Please connect wallet first");
      return;
    }

    setLoading(true);
    setStatus("🌐 Making HTTP GET request...");
    setHttpLogs([]);

    try {
      const url = `/api/weather?city=${city}&address=${userAddress}`;
      
      // Make actual HTTP GET request
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "x-user-address": userAddress,
        },
      });

      const data = await response.json();
      
      // Log HTTP request/response
      logHttpRequest("GET", url, response.status, response.statusText, data);

      if (response.status === 402) {
        // HTTP 402 Payment Required!
        setStatus("💳 HTTP 402 - Payment Required");
        setPaymentRequired(true);
        setPaymentInfo({
          amount: data.amount,
          currency: data.currency,
          decimals: data.decimals,
          adapterAddress: data.paymentInfo?.adapterAddress || "",
          instructions: data.instructions,
        });
      } else if (response.status === 200) {
        // Already paid - got weather data
        setWeather({
          city: data.weather.city,
          temperature: data.weather.temperature,
          condition: data.weather.condition,
          message: data.message,
        });
        setStatus("✅ HTTP 200 - Data received (already paid)");
      } else {
        setStatus(`❌ HTTP ${response.status} - ${data.error || "Unknown error"}`);
      }

    } catch (error: any) {
      console.error("HTTP request error:", error);
      setStatus(`❌ Error: ${error.message}`);
      logHttpRequest("GET", `/api/weather?city=${city}`, 0, "FAILED", { error: error.message });
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Pay on-chain (via x402)
  const payOnChain = async () => {
    if (!signer || !paymentInfo) {
      setStatus("❌ No payment info or signer");
      return;
    }

    setPaying(true);
    setStatus("💸 Executing on-chain payment...");

    try {
      // For demo: Use existing subscription API to make payment
      // In production, you'd have a dedicated payment endpoint
      
      // First, generate ZK proof (via precomputes API)
      setStatus("🔐 Generating ZK proof...");
      
      const noteId = ethers.id(`payment-${Date.now()}`);
      const maxAmountUsd = parseInt(paymentInfo.amount) / 1_000_000; // Amount in USDC
      
      const precomputeRes = await fetch("/api/precomputes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          noteId: noteId,
          maxAmountUsd: maxAmountUsd,
        }),
      });

      if (!precomputeRes.ok) {
        throw new Error("Failed to generate precomputes");
      }

      const precomputesData = await precomputeRes.json();
      
      if (!precomputesData.precomputes || precomputesData.precomputes.length === 0) {
        throw new Error("No precomputes returned from backend");
      }
      
      setStatus("✅ ZK proof generated");

      // Sign EIP-712 permit
      setStatus("✍️ Signing permit...");
      
      const chainId = await signer.provider!.getNetwork().then(n => Number(n.chainId));
      const merchantAddress = userAddress; // Demo: pay to self
      const maxAmountWei = paymentInfo.amount;
      const expiry = Math.floor(Date.now() / 1000) + 3600;
      const nonce = Date.now();

      const domain = {
        name: "Bermuda X402",
        version: "1",
        chainId: chainId,
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

      // Get merchant's shielded commitment from environment (or use public address)
      const merchantCommitment = process.env.NEXT_PUBLIC_MERCHANT_COMMITMENT || "0x0000000000000000000000000000000000000000000000000000000000000000";
      
      const signature = await signer.signTypedData(domain, types, {
        noteId: noteId,
        merchant: merchantAddress,
        maxAmount: BigInt(maxAmountWei),
        expiry: BigInt(expiry),
        nonce: BigInt(nonce),
        merchantCommitment: merchantCommitment as `0x${string}`,
      });

      setStatus("✅ Permit signed");

      // Execute payment via relayer
      setStatus("🚀 Executing payment transaction...");

      const merchantCommitment = process.env.NEXT_PUBLIC_MERCHANT_COMMITMENT || "0x0000000000000000000000000000000000000000000000000000000000000000";
      
      const permit = {
        noteId: noteId,
        merchant: merchantAddress,
        maxAmount: maxAmountWei,
        expiry: expiry,
        nonce: nonce,
        signature: signature,
        merchantCommitment: merchantCommitment as `0x${string}`,
      };

      const firstPrecompute = precomputesData.precomputes[0];
      const args = [
        firstPrecompute.proof,
        firstPrecompute.publicInputs,
        permit,
        merchantAddress,
        paymentInfo.amount,
      ];

      const executeRes = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adapter: paymentInfo.adapterAddress,
          method: "take",
          args: args,
        }),
      });

      if (!executeRes.ok) {
        const error = await executeRes.json();
        throw new Error(error.error || "Payment failed");
      }

      const result = await executeRes.json();
      setTxHash(result.txHash);
      setStatus(`✅ Payment successful! TX: ${result.txHash.slice(0, 10)}...`);

    } catch (error: any) {
      console.error("Payment error:", error);
      setStatus(`❌ Payment failed: ${error.message}`);
    } finally {
      setPaying(false);
    }
  };

  // Step 3: HTTP POST - Submit payment proof
  const submitPaymentProof = async () => {
    if (!txHash) {
      setStatus("❌ No transaction hash available");
      return;
    }

    setLoading(true);
    setStatus("🌐 Making HTTP POST with payment proof...");

    try {
      const url = `/api/weather?city=${city}`;
      
      // Make actual HTTP POST request with payment proof
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-address": userAddress,
        },
        body: JSON.stringify({
          txHash: txHash,
          address: userAddress,
        }),
      });

      const data = await response.json();
      
      // Log HTTP request/response
      logHttpRequest("POST", url, response.status, response.statusText, data);

      if (response.ok) {
        // Payment verified - got weather data!
        setWeather({
          city: data.weather.city,
          temperature: data.weather.temperature,
          condition: data.weather.condition,
          message: data.message,
        });
        setStatus("✅ HTTP 200 - Payment verified! Data received.");
        setPaymentRequired(false);
        setPaymentInfo(null);
      } else {
        setStatus(`❌ HTTP ${response.status} - ${data.error || "Verification failed"}`);
      }

    } catch (error: any) {
      console.error("Payment proof submission error:", error);
      setStatus(`❌ Error: ${error.message}`);
      logHttpRequest("POST", `/api/weather?city=${city}`, 0, "FAILED", { error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      maxWidth: "1200px",
      margin: "0 auto",
      padding: "2rem",
      fontFamily: "system-ui, sans-serif",
      background: "#0a0a0a",
      color: "#ffffff",
      minHeight: "100vh",
    }}>
      <h1 style={{ fontSize: "2.5rem", marginBottom: "0.5rem", color: "#3b82f6" }}>
        🌐 HTTP 402 Complete Demo
      </h1>
      
      <p style={{ color: "#a0a0a0", marginBottom: "2rem", fontSize: "1.1rem" }}>
        Real HTTP calls with actual HTTP 402 Payment Required responses
      </p>

      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "2rem",
        marginBottom: "2rem",
      }}>
        {/* Left Column: Controls */}
        <div>
          {/* Wallet Connection */}
          <div style={{
            padding: "1.5rem",
            background: "#1a1a1a",
            borderRadius: "12px",
            marginBottom: "1rem",
            border: "1px solid #2a2a2a",
          }}>
            <h2 style={{ marginTop: 0, fontSize: "1.2rem" }}>1. Connect Wallet</h2>
            {!connected ? (
              <button
                onClick={connectWallet}
                style={{
                  padding: "0.75rem 1.5rem",
                  background: "#3b82f6",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "600",
                  width: "100%",
                }}
              >
                🔌 Connect MetaMask
              </button>
            ) : (
              <div style={{ color: "#22c55e" }}>
                ✅ Connected: {userAddress.slice(0, 6)}...{userAddress.slice(-4)}
              </div>
            )}
          </div>

          {/* City Selection */}
          <div style={{
            padding: "1.5rem",
            background: "#1a1a1a",
            borderRadius: "12px",
            marginBottom: "1rem",
            border: "1px solid #2a2a2a",
          }}>
            <h2 style={{ marginTop: 0, fontSize: "1.2rem" }}>2. Select City</h2>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              disabled={!connected}
              style={{
                padding: "0.75rem",
                width: "100%",
                background: "#0a0a0a",
                color: "#ffffff",
                border: "1px solid #3a3a3a",
                borderRadius: "8px",
                fontSize: "1rem",
              }}
            >
              <option value="hamburg">Hamburg</option>
              <option value="berlin">Berlin</option>
              <option value="munich">München</option>
            </select>
          </div>

          {/* Step 1: HTTP GET */}
          <div style={{
            padding: "1.5rem",
            background: "#1a1a1a",
            borderRadius: "12px",
            marginBottom: "1rem",
            border: "1px solid #2a2a2a",
          }}>
            <h2 style={{ marginTop: 0, fontSize: "1.2rem" }}>3. Make HTTP GET Request</h2>
            <button
              onClick={makeHTTPRequest}
              disabled={!connected || loading}
              style={{
                padding: "0.75rem 1.5rem",
                background: connected && !loading ? "#3b82f6" : "#6b7280",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: connected && !loading ? "pointer" : "not-allowed",
                fontWeight: "600",
                width: "100%",
              }}
            >
              {loading ? "🔄 Requesting..." : "🌐 GET /api/weather"}
            </button>
          </div>

          {/* Step 2: Pay (if 402) */}
          {paymentRequired && paymentInfo && (
            <div style={{
              padding: "1.5rem",
              background: "#fef3c7",
              color: "#78350f",
              borderRadius: "12px",
              marginBottom: "1rem",
              border: "2px solid #fbbf24",
            }}>
              <h2 style={{ marginTop: 0, fontSize: "1.2rem", color: "#78350f" }}>
                💳 HTTP 402 - Payment Required
              </h2>
              <p><strong>Amount:</strong> {parseInt(paymentInfo.amount) / 1_000_000} {paymentInfo.currency}</p>
              <p><strong>Adapter:</strong> {paymentInfo.adapterAddress.slice(0, 10)}...</p>
              <button
                onClick={payOnChain}
                disabled={paying || txHash !== ""}
                style={{
                  padding: "0.75rem 1.5rem",
                  background: paying || txHash ? "#6b7280" : "#f59e0b",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: paying || txHash ? "not-allowed" : "pointer",
                  fontWeight: "600",
                  width: "100%",
                  marginBottom: txHash ? "1rem" : 0,
                }}
              >
                {paying ? "💸 Paying..." : txHash ? "✅ Paid" : "💸 Pay On-Chain"}
              </button>
              
              {txHash && (
                <button
                  onClick={submitPaymentProof}
                  disabled={loading}
                  style={{
                    padding: "0.75rem 1.5rem",
                    background: "#22c55e",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    cursor: loading ? "not-allowed" : "pointer",
                    fontWeight: "600",
                    width: "100%",
                  }}
                >
                  {loading ? "🔄 Submitting..." : "📤 POST Payment Proof"}
                </button>
              )}
            </div>
          )}

          {/* Weather Result */}
          {weather && (
            <div style={{
              padding: "1.5rem",
              background: "#22c55e",
              color: "#ffffff",
              borderRadius: "12px",
              textAlign: "center",
            }}>
              <h2 style={{ marginTop: 0 }}>
                {weather.city}: {weather.message}
              </h2>
              <p style={{ fontSize: "2rem", margin: 0 }}>
                🌡️ {weather.temperature}°C - {weather.condition}
              </p>
            </div>
          )}
        </div>

        {/* Right Column: HTTP Logs */}
        <div>
          <div style={{
            padding: "1.5rem",
            background: "#1a1a1a",
            borderRadius: "12px",
            border: "1px solid #2a2a2a",
            height: "calc(100vh - 4rem)",
            overflow: "auto",
          }}>
            <h2 style={{ marginTop: 0, fontSize: "1.2rem" }}>📡 HTTP Request/Response Log</h2>
            
            {httpLogs.length === 0 ? (
              <p style={{ color: "#6b7280" }}>No HTTP requests yet. Click "GET /api/weather" to start.</p>
            ) : (
              <div>
                {httpLogs.map((log, index) => (
                  <div
                    key={index}
                    style={{
                      marginBottom: "1rem",
                      padding: "1rem",
                      background: "#0a0a0a",
                      borderRadius: "8px",
                      border: `2px solid ${
                        log.status === 402 ? "#fbbf24" :
                        log.status === 200 ? "#22c55e" :
                        log.status === 0 ? "#ef4444" :
                        "#6b7280"
                      }`,
                      fontFamily: "monospace",
                      fontSize: "0.9rem",
                    }}
                  >
                    <div style={{ marginBottom: "0.5rem", color: "#a0a0a0" }}>
                      {log.timestamp}
                    </div>
                    <div style={{ marginBottom: "0.5rem", fontWeight: "bold", color: "#3b82f6" }}>
                      {log.method} {log.url}
                    </div>
                    <div style={{
                      marginBottom: "0.5rem",
                      fontWeight: "bold",
                      color: log.status === 402 ? "#fbbf24" :
                             log.status === 200 ? "#22c55e" :
                             log.status === 0 ? "#ef4444" :
                             "#6b7280"
                    }}>
                      HTTP {log.status} {log.statusText}
                    </div>
                    {log.body && (
                      <pre style={{
                        background: "#000000",
                        padding: "0.5rem",
                        borderRadius: "4px",
                        overflow: "auto",
                        maxHeight: "200px",
                        fontSize: "0.8rem",
                        margin: 0,
                      }}>
                        {JSON.stringify(log.body, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status Bar */}
      {status && (
        <div style={{
          padding: "1rem",
          background: "#1a1a1a",
          borderRadius: "8px",
          textAlign: "center",
          color: status.includes("✅") ? "#22c55e" : 
                 status.includes("❌") ? "#ef4444" : 
                 status.includes("💳") ? "#fbbf24" : "#ffffff",
          fontWeight: "600",
        }}>
          {status}
        </div>
      )}
    </div>
  );
}

