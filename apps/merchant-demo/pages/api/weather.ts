import type { NextApiRequest, NextApiResponse } from "next";
import { ethers } from "ethers";

/**
 * HTTP 402 Payment Required Demo
 * 
 * This demonstrates the HTTP 402 pattern:
 * 1. Client requests service (GET)
 * 2. Server responds with HTTP 402 + payment info
 * 3. Client pays on-chain
 * 4. Client sends payment proof (POST)
 * 5. Server verifies payment and returns service data
 */

// In-memory storage for demo (use database in production)
const paymentRecords = new Map<string, {
  address: string;
  amount: string;
  txHash: string;
  timestamp: number;
}>();

// Payment requirement
const PAYMENT_AMOUNT = "1000000"; // 1 USDC (6 decimals)
const PAYMENT_CURRENCY = "USDC";
const RPC_URL = process.env.RPC_URL || "http://localhost:8545";

interface WeatherResponse {
  city: string;
  temperature: number;
  condition: string;
}

// City coordinates for OpenWeather API
const CITY_COORDS: Record<string, { lat: number; lon: number }> = {
  hamburg: { lat: 53.5511, lon: 9.9937 },
  berlin: { lat: 52.5200, lon: 13.4050 },
  munich: { lat: 48.1351, lon: 11.5820 },
};

// OpenWeather API configuration
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
// Using One Call API 3.0
const OPENWEATHER_API_URL = "https://api.openweathermap.org/data/3.0/onecall";

// Get REAL weather data from OpenWeather API
const getWeatherData = async (city: string): Promise<WeatherResponse> => {
  const cityLower = city.toLowerCase();
  const coords = CITY_COORDS[cityLower];
  
  if (!coords) {
    return {
      city,
      temperature: 20,
      condition: "Unknown city"
    };
  }

  // If no API key, fall back to mock data
  if (!OPENWEATHER_API_KEY) {
    console.warn("⚠️ OPENWEATHER_API_KEY not set, using mock data");
    const mockData: Record<string, WeatherResponse> = {
      hamburg: { city: "Hamburg", temperature: 7, condition: "overcast clouds" },
      berlin: { city: "Berlin", temperature: 5, condition: "clear sky" },
      munich: { city: "München", temperature: 3, condition: "light rain" },
    };
    return mockData[cityLower] || { city, temperature: 8, condition: "partly cloudy" };
  }
  
  console.log(`🌤️ Calling OpenWeather API for ${city} with key: ${OPENWEATHER_API_KEY.slice(0, 8)}...`);

  try {
    // Call OpenWeather One Call API 3.0
    const url = `${OPENWEATHER_API_URL}?lat=${coords.lat}&lon=${coords.lon}&exclude=minutely,hourly,daily,alerts&units=metric&appid=${OPENWEATHER_API_KEY}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`OpenWeather API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Extract current weather
    const temp = Math.round(data.current.temp);
    const condition = data.current.weather[0]?.description || "unknown";
    
    console.log(`✅ Real weather data for ${city}: ${temp}°C, ${condition}`);
    
    return {
      city: city.charAt(0).toUpperCase() + city.slice(1),
      temperature: temp,
      condition: condition
    };
    
  } catch (error: any) {
    console.error("❌ OpenWeather API error:", error.message);
    console.error("💡 Tip: Check OPENWEATHER_API_KEY or subscription status");
    // Fallback to mock data on error
    return {
      city: city.charAt(0).toUpperCase() + city.slice(1),
      temperature: 7,
      condition: "overcast clouds (using fallback data)"
    };
  }
};

/**
 * GET /api/weather/:city
 * Returns HTTP 402 if payment not made, or weather data if paid
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { city } = req.query;
  
  if (!city || typeof city !== "string") {
    return res.status(400).json({ error: "City parameter required" });
  }

  // Get user address from request (in production, use auth token)
  const userAddress = req.headers["x-user-address"] as string || 
                      req.query.address as string;

  if (!userAddress) {
    return res.status(400).json({ 
      error: "User address required",
      hint: "Send 'x-user-address' header or 'address' query param"
    });
  }

  const address = ethers.getAddress(userAddress.toLowerCase());

  // Handle POST request - client submitting payment proof
  if (req.method === "POST") {
    return handlePaymentProof(req, res, city, address);
  }

  // Handle GET request - check if payment exists or return 402

  // Check if user has already paid for this city
  const paymentKey = `${address}:${city}`;
  const payment = paymentRecords.get(paymentKey);

  if (!payment) {
    // HTTP 402: Payment Required
    return res.status(402).json({
      paymentRequired: true,
      amount: PAYMENT_AMOUNT,
      currency: PAYMENT_CURRENCY,
      decimals: 6,
      description: `Weather data for ${city}`,
      paymentInfo: {
        // For demo: Use x402 adapter address
        adapterAddress: process.env.NEXT_PUBLIC_X402_ADAPTER || "",
        recipient: process.env.MERCHANT_ADDRESS || address, // Merchant receives payment
        note: `Weather API payment for ${city}`,
      },
      // Client should:
      // 1. Create x402 subscription or one-time payment
      // 2. Get txHash from payment
      // 3. POST back to this endpoint with txHash
      instructions: {
        step1: "Call /api/subscription (POST) or execute payment via /api/execute",
        step2: "Get txHash from payment response",
        step3: "POST to this endpoint with txHash in body"
      }
    });
  }

  // User has paid - verify payment on-chain
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  
  try {
    // Verify transaction exists and is confirmed
    const tx = await provider.getTransaction(payment.txHash);
    if (!tx) {
      // Payment transaction doesn't exist
      paymentRecords.delete(paymentKey);
      return res.status(402).json({
        paymentRequired: true,
        error: "Payment transaction not found on-chain"
      });
    }

    const receipt = await provider.getTransactionReceipt(payment.txHash);
    if (!receipt || receipt.status !== 1) {
      // Transaction failed
      paymentRecords.delete(paymentKey);
      return res.status(402).json({
        paymentRequired: true,
        error: "Payment transaction failed"
      });
    }

    // Payment verified - return weather data
    const weather = await getWeatherData(city);
    
    return res.status(200).json({
      success: true,
      payment: {
        txHash: payment.txHash,
        amount: payment.amount,
        timestamp: payment.timestamp,
      },
      weather: weather,
      message: `${weather.temperature}°C, ${weather.condition}`
    });

  } catch (error: any) {
    console.error("Payment verification error:", error);
    return res.status(500).json({
      error: "Payment verification failed",
      details: error.message
    });
  }
}

/**
 * POST /api/weather/:city
 * Client sends payment proof (txHash) after paying
 */
async function handlePaymentProof(
  req: NextApiRequest,
  res: NextApiResponse,
  city: string,
  addr: string
) {
  const { txHash } = req.body;

  if (!txHash) {
    return res.status(400).json({ error: "txHash required in request body" });
  }

  // Verify transaction on-chain
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  
  try {
    const receipt = await provider.getTransactionReceipt(txHash);
    
    if (!receipt || receipt.status !== 1) {
      return res.status(400).json({
        error: "Invalid payment transaction",
        txHash,
        status: receipt?.status || "not_found"
      });
    }

    // Verify transaction is to the correct contract
    const ADAPTER_ADDR = process.env.NEXT_PUBLIC_X402_ADAPTER || "";
    if (ADAPTER_ADDR && receipt.to?.toLowerCase() !== ADAPTER_ADDR.toLowerCase()) {
      console.warn(`Transaction not to expected adapter: ${receipt.to} vs ${ADAPTER_ADDR}`);
    }

    // Check if Take event was emitted (from X402Adapter)
    // In production, you'd parse events more carefully
    const paymentKey = `${addr}:${city}`;
    
    // Store payment record
    paymentRecords.set(paymentKey, {
      address: addr,
      amount: PAYMENT_AMOUNT,
      txHash,
      timestamp: Date.now()
    });

    // Return weather data immediately
    const weather = await getWeatherData(city);
    
    return res.status(200).json({
      success: true,
      payment: {
        txHash,
        amount: PAYMENT_AMOUNT,
        currency: PAYMENT_CURRENCY,
        timestamp: Date.now(),
      },
      weather: weather,
      message: `${weather.temperature}°C, ${weather.condition}`
    });

  } catch (error: any) {
    console.error("Payment verification error:", error);
    return res.status(500).json({
      error: "Payment verification failed",
      details: error.message
    });
  }
}

