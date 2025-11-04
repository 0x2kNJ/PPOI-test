import { useState } from "react";
import { ethers } from "ethers";

declare global {
  interface Window {
    ethereum?: any;
  }
}

/**
 * HTTP 402 Payment Required Demo UI
 * 
 * Demonstrates:
 * 1. Request weather data
 * 2. Server responds with HTTP 402
 * 3. User pays on-chain
 * 4. User sends payment proof
 * 5. Server returns weather data
 */
export default function WeatherDemo() {
  const [connected, setConnected] = useState(false);
  const [userAddress, setUserAddress] = useState("");
  const [city, setCity] = useState("hamburg");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [paymentInfo, setPaymentInfo] = useState<{
    amount: string;
    currency: string;
    adapterAddress: string;
  } | null>(null);
  const [weather, setWeather] = useState<{
    city: string;
    temperature: number;
    condition: string;
    message: string;
  } | null>(null);

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask!");
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      
      setUserAddress(address);
      setConnected(true);
      setStatus("✅ Wallet connected");
    } catch (error: any) {
      console.error("Connection error:", error);
      setStatus(`❌ Error: ${error.message}`);
    }
  };

  const requestWeather = async () => {
    if (!connected || !userAddress) {
      setStatus("❌ Please connect wallet first");
      return;
    }

    setLoading(true);
    setStatus("🔄 Requesting weather data...");

    try {
      // Step 1: Request weather (will get HTTP 402 if not paid)
      const response = await fetch(`/api/weather.example?city=${city}&address=${userAddress}`, {
        headers: {
          "x-user-address": userAddress,
        },
      });

      const data = await response.json();

      if (response.status === 402) {
        // HTTP 402: Payment Required
        setStatus("💳 Payment required!");
        setPaymentInfo({
          amount: data.amount,
          currency: data.currency,
          adapterAddress: data.paymentInfo?.adapterAddress || "",
        });

        // Show payment instructions
        alert(
          `HTTP 402 Payment Required!\n\n` +
          `Amount: ${parseInt(data.amount) / 1_000_000} ${data.currency}\n\n` +
          `To pay:\n` +
          `1. Go to subscription demo\n` +
          `2. Create payment for ${parseInt(data.amount) / 1_000_000} ${data.currency}\n` +
          `3. Get txHash from payment\n` +
          `4. Click "Submit Payment Proof" below`
        );

      } else if (response.status === 200) {
        // Already paid - return weather
        setWeather({
          city: data.weather.city,
          temperature: data.weather.temperature,
          condition: data.weather.condition,
          message: data.message,
        });
        setStatus("✅ Weather data received!");
      } else {
        setStatus(`❌ Error: ${data.error || "Unknown error"}`);
      }

    } catch (error: any) {
      console.error("Request error:", error);
      setStatus(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const submitPaymentProof = async () => {
    if (!userAddress) {
      setStatus("❌ Please connect wallet first");
      return;
    }

    // Get txHash from user (in real app, you'd get this from payment flow)
    const txHash = prompt(
      "Enter the transaction hash (txHash) from your payment:"
    );

    if (!txHash) {
      setStatus("❌ No txHash provided");
      return;
    }

    setLoading(true);
    setStatus("🔄 Verifying payment...");

    try {
      // Step 2: POST payment proof
      const response = await fetch(`/api/weather.example?city=${city}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-address": userAddress,
        },
        body: JSON.stringify({
          txHash,
          address: userAddress,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setWeather({
          city: data.weather.city,
          temperature: data.weather.temperature,
          condition: data.weather.condition,
          message: data.message,
        });
        setStatus("✅ Payment verified! Weather data received.");
        setPaymentInfo(null);
      } else {
        setStatus(`❌ Error: ${data.error || "Payment verification failed"}`);
      }

    } catch (error: any) {
      console.error("Payment proof error:", error);
      setStatus(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      maxWidth: "800px",
      margin: "0 auto",
      padding: "2rem",
      fontFamily: "system-ui, sans-serif",
      background: "#1a1a1a",
      color: "#ffffff",
      minHeight: "100vh",
    }}>
      <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>
        🌤️ HTTP 402 Weather API Demo
      </h1>
      
      <p style={{ color: "#a0a0a0", marginBottom: "2rem" }}>
        Demonstrates HTTP 402 Payment Required pattern:
        <br />1. Request weather → Server responds with HTTP 402
        <br />2. Pay on-chain (via x402)
        <br />3. Submit payment proof → Get weather data
      </p>

      {/* Wallet Connection */}
      <div style={{
        padding: "1rem",
        background: "#2a2a2a",
        borderRadius: "8px",
        marginBottom: "2rem",
      }}>
        {!connected ? (
          <button
            onClick={connectWallet}
            style={{
              padding: "0.75rem 1.5rem",
              background: "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "600",
            }}
          >
            🔌 Connect Wallet
          </button>
        ) : (
          <div>
            <div style={{ color: "#22c55e", marginBottom: "0.5rem" }}>
              ✅ Connected: {userAddress.slice(0, 6)}...{userAddress.slice(-4)}
            </div>
            <button
              onClick={() => {
                setConnected(false);
                setUserAddress("");
              }}
              style={{
                padding: "0.5rem 1rem",
                background: "transparent",
                color: "#6b7280",
                border: "1px solid #3a3a3a",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              Disconnect
            </button>
          </div>
        )}
      </div>

      {/* City Input */}
      <div style={{ marginBottom: "2rem" }}>
        <label style={{ display: "block", marginBottom: "0.5rem" }}>
          City:
        </label>
        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          style={{
            padding: "0.75rem",
            width: "100%",
            background: "#2a2a2a",
            color: "#ffffff",
            border: "1px solid #3a3a3a",
            borderRadius: "6px",
            fontSize: "1rem",
          }}
        >
          <option value="hamburg">Hamburg</option>
          <option value="berlin">Berlin</option>
          <option value="munich">München</option>
        </select>
      </div>

      {/* Request Weather Button */}
      <button
        onClick={requestWeather}
        disabled={!connected || loading}
        style={{
          padding: "0.75rem 1.5rem",
          background: connected && !loading ? "#3b82f6" : "#6b7280",
          color: "white",
          border: "none",
          borderRadius: "6px",
          cursor: connected && !loading ? "pointer" : "not-allowed",
          fontWeight: "600",
          fontSize: "1rem",
          width: "100%",
          marginBottom: "1rem",
        }}
      >
        {loading ? "🔄 Requesting..." : "🌤️ Request Weather Data"}
      </button>

      {/* Payment Info (HTTP 402 Response) */}
      {paymentInfo && (
        <div style={{
          padding: "1rem",
          background: "#fef3c7",
          color: "#78350f",
          borderRadius: "8px",
          marginBottom: "1rem",
        }}>
          <h3 style={{ marginTop: 0 }}>💳 Payment Required (HTTP 402)</h3>
          <p>
            <strong>Amount:</strong> {parseInt(paymentInfo.amount) / 1_000_000} {paymentInfo.currency}
          </p>
          <p>
            <strong>Adapter:</strong> {paymentInfo.adapterAddress.slice(0, 10)}...
          </p>
          <p style={{ marginBottom: 0 }}>
            To pay: Use subscription demo to create payment, then submit txHash below
          </p>
        </div>
      )}

      {/* Submit Payment Proof Button */}
      {paymentInfo && (
        <button
          onClick={submitPaymentProof}
          disabled={loading}
          style={{
            padding: "0.75rem 1.5rem",
            background: "#22c55e",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: loading ? "not-allowed" : "pointer",
            fontWeight: "600",
            fontSize: "1rem",
            width: "100%",
            marginBottom: "1rem",
          }}
        >
          {loading ? "🔄 Verifying..." : "✅ Submit Payment Proof (txHash)"}
        </button>
      )}

      {/* Weather Result */}
      {weather && (
        <div style={{
          padding: "1.5rem",
          background: "#22c55e",
          color: "#ffffff",
          borderRadius: "8px",
          textAlign: "center",
        }}>
          <h2 style={{ marginTop: 0 }}>
            {weather.city}: {weather.message}
          </h2>
          <p style={{ fontSize: "1.5rem", margin: 0 }}>
            🌡️ {weather.temperature}°C - {weather.condition}
          </p>
        </div>
      )}

      {/* Status */}
      {status && (
        <div style={{
          padding: "1rem",
          background: "#2a2a2a",
          borderRadius: "8px",
          marginTop: "1rem",
          color: status.includes("✅") ? "#22c55e" : 
                 status.includes("❌") ? "#ef4444" : "#ffffff",
        }}>
          {status}
        </div>
      )}

      {/* Instructions */}
      <div style={{
        marginTop: "2rem",
        padding: "1rem",
        background: "#2a2a2a",
        borderRadius: "8px",
        fontSize: "0.9rem",
        color: "#a0a0a0",
      }}>
        <h3 style={{ color: "#ffffff", marginTop: 0 }}>📋 How It Works:</h3>
        <ol style={{ lineHeight: "1.8" }}>
          <li>Connect wallet</li>
          <li>Select city and click "Request Weather Data"</li>
          <li>Server responds with <strong>HTTP 402 Payment Required</strong></li>
          <li>Go to subscription demo and create payment for the amount</li>
          <li>Get the txHash from the payment transaction</li>
          <li>Click "Submit Payment Proof" and enter the txHash</li>
          <li>Server verifies payment on-chain and returns weather data</li>
        </ol>
      </div>
    </div>
  );
}







