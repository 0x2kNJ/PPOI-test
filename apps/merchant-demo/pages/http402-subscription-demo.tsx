import { useState } from "react";
import { ethers } from "ethers";

declare global {
  interface Window {
    ethereum?: any;
  }
}

/**
 * HTTP 402 Subscription Model Demo
 * 
 * Scenario:
 * 1. User requests weather → HTTP 402 (subscription required)
 * 2. User subscribes (pays once) → gets daily/weekly/monthly access
 * 3. User can make unlimited requests during subscription period
 * 4. Server checks subscription on each request
 */
export default function HTTP402SubscriptionDemo() {
  const [connected, setConnected] = useState(false);
  const [userAddress, setUserAddress] = useState("");
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [city, setCity] = useState("hamburg");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  
  // Subscription state
  const [hasSubscription, setHasSubscription] = useState(false);
  const [subscription, setSubscription] = useState<{
    plan: string;
    expiryDate: string;
    daysRemaining: number;
    requestCount: number;
    requestLimit: number;
  } | null>(null);
  
  // Plans (from HTTP 402 response)
  const [availablePlans, setAvailablePlans] = useState<Array<{
    id: string;
    name: string;
    price: number;
    currency: string;
    duration: string;
    requestLimit: number;
  }>>([]);
  const [selectedPlan, setSelectedPlan] = useState<string>("daily");
  
  // Payment state
  const [paying, setPaying] = useState(false);
  const [txHash, setTxHash] = useState("");
  
  // Weather data
  const [weatherHistory, setWeatherHistory] = useState<Array<{
    timestamp: string;
    city: string;
    temperature: number;
    condition: string;
    requestNumber: number;
  }>>([]);
  
  // HTTP logs
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

  // Request weather (checks subscription)
  const requestWeather = async () => {
    if (!connected || !userAddress) {
      setStatus("❌ Please connect wallet first");
      return;
    }

    setLoading(true);
    setStatus("🌐 Requesting weather data...");

    try {
      const url = `/api/weather-subscription?city=${city}&address=${userAddress}`;
      
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "x-user-address": userAddress,
        },
      });

      const data = await response.json();
      logHttpRequest("GET", url, response.status, response.statusText, data);

      if (response.status === 402) {
        // No subscription or expired
        setStatus("💳 HTTP 402 - Subscription Required");
        setHasSubscription(false);
        
        if (data.plans) {
          setAvailablePlans(data.plans);
        }
      } else if (response.status === 200) {
        // Success - has active subscription
        setStatus("✅ Weather data received!");
        setHasSubscription(true);
        setSubscription(data.subscription);
        
        // Add to history
        setWeatherHistory(prev => [...prev, {
          timestamp: new Date().toISOString(),
          city: data.weather.city,
          temperature: data.weather.temperature,
          condition: data.weather.condition,
          requestNumber: data.subscription.requestCount,
        }]);
      } else if (response.status === 429) {
        // Request limit exceeded
        setStatus("❌ Request limit exceeded - Please upgrade");
      } else {
        setStatus(`❌ HTTP ${response.status} - ${data.error || "Unknown error"}`);
      }

    } catch (error: any) {
      console.error("Request error:", error);
      setStatus(`❌ Error: ${error.message}`);
      logHttpRequest("GET", `/api/weather-subscription`, 0, "FAILED", { error: error.message });
    } finally {
      setLoading(false);
    }
  };

  // Subscribe (pay for subscription)
  const subscribe = async () => {
    if (!signer) {
      setStatus("❌ No signer");
      return;
    }

    const plan = availablePlans.find(p => p.id === selectedPlan);
    if (!plan) {
      setStatus("❌ No plan selected");
      return;
    }

    setPaying(true);
    setStatus(`💸 Subscribing to ${plan.name}...`);

    try {
      // Generate ZK proof
      setStatus("🔐 Generating ZK proof...");
      
      const noteId = ethers.id(`subscription-${Date.now()}`);
      const amountUSDC = plan.price;
      
      const precomputeRes = await fetch("/api/precomputes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          noteId: noteId,
          maxAmountUsd: amountUSDC,
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
      const merchantAddress = userAddress;
      const maxAmountWei = (amountUSDC * 1_000_000).toString();
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

      // Execute payment
      setStatus("🚀 Executing payment...");

      const ADAPTER_ADDR = process.env.NEXT_PUBLIC_X402_ADAPTER || "";
      
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
        maxAmountWei,
      ];

      const executeRes = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adapter: ADAPTER_ADDR,
          method: "take",
          args: args,
        }),
      });

      if (!executeRes.ok) {
        const error = await executeRes.json();
        throw new Error(error.error || "Payment failed");
      }

      const result = await executeRes.json();
      const paymentTxHash = result.txHash;
      setTxHash(paymentTxHash);
      setStatus("✅ Payment successful!");

      // Create subscription
      setStatus("📝 Creating subscription...");

      const subRes = await fetch("/api/weather-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: userAddress,
          txHash: paymentTxHash,
          plan: selectedPlan,
        }),
      });

      const subData = await subRes.json();
      logHttpRequest("POST", "/api/weather-subscription", subRes.status, subRes.statusText, subData);

      if (subRes.ok) {
        setStatus(`✅ Subscribed to ${plan.name}!`);
        setHasSubscription(true);
        setSubscription(subData.subscription);
      } else {
        setStatus(`❌ Subscription failed: ${subData.error}`);
      }

    } catch (error: any) {
      console.error("Subscribe error:", error);
      setStatus(`❌ Error: ${error.message}`);
    } finally {
      setPaying(false);
    }
  };

  return (
    <div style={{
      maxWidth: "1400px",
      margin: "0 auto",
      padding: "2rem",
      fontFamily: "system-ui, sans-serif",
      background: "#0a0a0a",
      color: "#ffffff",
      minHeight: "100vh",
    }}>
      <h1 style={{ fontSize: "2.5rem", marginBottom: "0.5rem", color: "#3b82f6" }}>
        🔄 HTTP 402 Subscription Demo
      </h1>
      
      <p style={{ color: "#a0a0a0", marginBottom: "2rem", fontSize: "1.1rem" }}>
        Subscribe once → Get unlimited access during subscription period
      </p>

      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: "1.5rem",
      }}>
        {/* Column 1: Wallet & Subscription */}
        <div>
          {/* Wallet */}
          <div style={{
            padding: "1.5rem",
            background: "#1a1a1a",
            borderRadius: "12px",
            marginBottom: "1rem",
            border: "1px solid #2a2a2a",
          }}>
            <h2 style={{ marginTop: 0, fontSize: "1.2rem" }}>1. Wallet</h2>
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
                🔌 Connect
              </button>
            ) : (
              <div style={{ color: "#22c55e", fontSize: "0.9rem" }}>
                ✅ {userAddress.slice(0, 8)}...{userAddress.slice(-6)}
              </div>
            )}
          </div>

          {/* Subscription Status */}
          {hasSubscription && subscription ? (
            <div style={{
              padding: "1.5rem",
              background: "#064e3b",
              borderRadius: "12px",
              marginBottom: "1rem",
              border: "2px solid #22c55e",
            }}>
              <h2 style={{ marginTop: 0, fontSize: "1.2rem", color: "#22c55e" }}>
                ✅ Active Subscription
              </h2>
              <p style={{ margin: "0.5rem 0", fontSize: "0.9rem" }}>
                <strong>Plan:</strong> {subscription.plan}
              </p>
              <p style={{ margin: "0.5rem 0", fontSize: "0.9rem" }}>
                <strong>Days remaining:</strong> {subscription.daysRemaining}
              </p>
              <p style={{ margin: "0.5rem 0", fontSize: "0.9rem" }}>
                <strong>Requests:</strong> {subscription.requestCount} / {subscription.requestLimit}
              </p>
            </div>
          ) : (
            <div style={{
              padding: "1.5rem",
              background: "#451a03",
              borderRadius: "12px",
              marginBottom: "1rem",
              border: "2px solid #f59e0b",
            }}>
              <h2 style={{ marginTop: 0, fontSize: "1.2rem", color: "#fbbf24" }}>
                ❌ No Active Subscription
              </h2>
              <p style={{ fontSize: "0.9rem", color: "#fcd34d" }}>
                Subscribe to get unlimited weather requests
              </p>
            </div>
          )}

          {/* Subscription Plans */}
          {!hasSubscription && availablePlans.length > 0 && (
            <div style={{
              padding: "1.5rem",
              background: "#1a1a1a",
              borderRadius: "12px",
              marginBottom: "1rem",
              border: "1px solid #2a2a2a",
            }}>
              <h2 style={{ marginTop: 0, fontSize: "1.2rem" }}>2. Choose Plan</h2>
              {availablePlans.map(plan => (
                <div
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  style={{
                    padding: "1rem",
                    marginBottom: "0.5rem",
                    background: selectedPlan === plan.id ? "#1e3a8a" : "#0a0a0a",
                    border: `2px solid ${selectedPlan === plan.id ? "#3b82f6" : "#2a2a2a"}`,
                    borderRadius: "8px",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontWeight: "bold", marginBottom: "0.25rem" }}>
                    {plan.name}
                  </div>
                  <div style={{ fontSize: "0.9rem", color: "#a0a0a0" }}>
                    {plan.price} {plan.currency} · {plan.duration}
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "#6b7280" }}>
                    {plan.requestLimit} requests
                  </div>
                </div>
              ))}
              
              <button
                onClick={subscribe}
                disabled={paying || !selectedPlan}
                style={{
                  padding: "0.75rem 1.5rem",
                  background: paying ? "#6b7280" : "#f59e0b",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: paying ? "not-allowed" : "pointer",
                  fontWeight: "600",
                  width: "100%",
                  marginTop: "1rem",
                }}
              >
                {paying ? "💸 Subscribing..." : "💸 Subscribe Now"}
              </button>
            </div>
          )}

          {/* Request Weather */}
          <div style={{
            padding: "1.5rem",
            background: "#1a1a1a",
            borderRadius: "12px",
            border: "1px solid #2a2a2a",
          }}>
            <h2 style={{ marginTop: 0, fontSize: "1.2rem" }}>3. Request Weather</h2>
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
                marginBottom: "1rem",
              }}
            >
              <option value="hamburg">Hamburg</option>
              <option value="berlin">Berlin</option>
              <option value="munich">München</option>
            </select>
            
            <button
              onClick={requestWeather}
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
              {loading ? "🔄 Requesting..." : "🌐 GET Weather"}
            </button>
          </div>
        </div>

        {/* Column 2: Weather History */}
        <div>
          <div style={{
            padding: "1.5rem",
            background: "#1a1a1a",
            borderRadius: "12px",
            border: "1px solid #2a2a2a",
            height: "calc(100vh - 4rem)",
            overflow: "auto",
          }}>
            <h2 style={{ marginTop: 0, fontSize: "1.2rem" }}>🌤️ Weather History</h2>
            
            {weatherHistory.length === 0 ? (
              <p style={{ color: "#6b7280" }}>
                {hasSubscription 
                  ? "No weather requests yet. Click 'GET Weather' to start."
                  : "Subscribe first to access weather data."}
              </p>
            ) : (
              <div>
                {weatherHistory.reverse().map((entry, index) => (
                  <div
                    key={index}
                    style={{
                      marginBottom: "1rem",
                      padding: "1rem",
                      background: "#064e3b",
                      borderRadius: "8px",
                      border: "1px solid #22c55e",
                    }}
                  >
                    <div style={{ color: "#6b7280", fontSize: "0.8rem", marginBottom: "0.5rem" }}>
                      Request #{entry.requestNumber} · {new Date(entry.timestamp).toLocaleTimeString()}
                    </div>
                    <div style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "0.25rem" }}>
                      {entry.city}
                    </div>
                    <div style={{ fontSize: "1.2rem" }}>
                      🌡️ {entry.temperature}°C · {entry.condition}
                    </div>
                  </div>
                )).reverse()}
              </div>
            )}
          </div>
        </div>

        {/* Column 3: HTTP Logs */}
        <div>
          <div style={{
            padding: "1.5rem",
            background: "#1a1a1a",
            borderRadius: "12px",
            border: "1px solid #2a2a2a",
            height: "calc(100vh - 4rem)",
            overflow: "auto",
          }}>
            <h2 style={{ marginTop: 0, fontSize: "1.2rem" }}>📡 HTTP Logs</h2>
            
            {httpLogs.length === 0 ? (
              <p style={{ color: "#6b7280" }}>No HTTP requests yet.</p>
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
                        "#ef4444"
                      }`,
                      fontFamily: "monospace",
                      fontSize: "0.85rem",
                    }}
                  >
                    <div style={{ color: "#6b7280", marginBottom: "0.5rem" }}>
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </div>
                    <div style={{ fontWeight: "bold", color: "#3b82f6", marginBottom: "0.5rem" }}>
                      {log.method} {log.url.split('?')[0]}
                    </div>
                    <div style={{
                      fontWeight: "bold",
                      color: log.status === 402 ? "#fbbf24" :
                             log.status === 200 ? "#22c55e" :
                             "#ef4444"
                    }}>
                      HTTP {log.status} {log.statusText}
                    </div>
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
          position: "fixed",
          bottom: "1rem",
          left: "50%",
          transform: "translateX(-50%)",
          padding: "1rem 2rem",
          background: "#1a1a1a",
          border: "2px solid #3a3a3a",
          borderRadius: "8px",
          color: status.includes("✅") ? "#22c55e" : 
                 status.includes("❌") ? "#ef4444" : 
                 status.includes("💳") ? "#fbbf24" : "#ffffff",
          fontWeight: "600",
          boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
        }}>
          {status}
        </div>
      )}
    </div>
  );
}

