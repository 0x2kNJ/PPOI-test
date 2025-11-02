import type { NextApiRequest, NextApiResponse } from "next";
import { ethers } from "ethers";

/**
 * HTTP 402 with Subscription Model
 * 
 * Flow:
 * 1. User requests service → HTTP 402 if no active subscription
 * 2. User creates subscription (one-time payment)
 * 3. User gets unlimited access for subscription period
 * 4. Server checks subscription on each request
 */

// Subscription storage (use database in production)
const subscriptions = new Map<string, {
  address: string;
  plan: string;
  startDate: number;
  expiryDate: number;
  txHash: string;
  requestCount: number;
  lastRequestDate: number;
}>();

// Subscription plans
const PLANS = {
  daily: {
    name: "Daily Access",
    duration: 24 * 60 * 60 * 1000, // 24 hours
    price: "1000000", // 1 USDC
    requestLimit: 100,
  },
  weekly: {
    name: "Weekly Access",
    duration: 7 * 24 * 60 * 60 * 1000, // 7 days
    price: "5000000", // 5 USDC
    requestLimit: 1000,
  },
  monthly: {
    name: "Monthly Access",
    duration: 30 * 24 * 60 * 60 * 1000, // 30 days
    price: "15000000", // 15 USDC
    requestLimit: 10000,
  },
};

const RPC_URL = process.env.RPC_URL || "http://localhost:8545";

interface WeatherResponse {
  city: string;
  temperature: number;
  condition: string;
  forecast: string[];
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
      condition: "Unknown city",
      forecast: []
    };
  }

  // If no API key, fall back to mock data
  if (!OPENWEATHER_API_KEY) {
    console.warn("⚠️ OPENWEATHER_API_KEY not set, using mock data");
    const mockData: Record<string, WeatherResponse> = {
      hamburg: {
        city: "Hamburg",
        temperature: 7,
        condition: "overcast clouds",
        forecast: ["6°C light rain", "8°C partly cloudy", "5°C clear sky"],
      },
      berlin: {
        city: "Berlin",
        temperature: 5,
        condition: "clear sky",
        forecast: ["7°C partly cloudy", "6°C light rain", "4°C clear sky"],
      },
      munich: {
        city: "München",
        temperature: 3,
        condition: "light rain",
        forecast: ["4°C overcast clouds", "6°C clear sky", "5°C partly cloudy"],
      },
    };
    return mockData[cityLower] || {
      city,
      temperature: 8,
      condition: "partly cloudy",
      forecast: []
    };
  }

  try {
    // Call OpenWeather One Call API 3.0 (include daily forecast)
    const url = `${OPENWEATHER_API_URL}?lat=${coords.lat}&lon=${coords.lon}&exclude=minutely,hourly,alerts&units=metric&appid=${OPENWEATHER_API_KEY}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`OpenWeather API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Extract current weather
    const temp = Math.round(data.current.temp);
    const condition = data.current.weather[0]?.description || "unknown";
    
    // Extract 3-day forecast
    const forecast: string[] = [];
    if (data.daily && data.daily.length > 1) {
      for (let i = 1; i <= 3 && i < data.daily.length; i++) {
        const dayTemp = Math.round(data.daily[i].temp.day);
        const dayCondition = data.daily[i].weather[0]?.description || "unknown";
        forecast.push(`${dayTemp}°C ${dayCondition}`);
      }
    }
    
    console.log(`✅ Real weather data for ${city}: ${temp}°C, ${condition}`);
    
    return {
      city: city.charAt(0).toUpperCase() + city.slice(1),
      temperature: temp,
      condition: condition,
      forecast: forecast
    };
    
  } catch (error: any) {
    console.error("❌ OpenWeather API error:", error.message);
    console.error("💡 Tip: Check OPENWEATHER_API_KEY or subscription status");
    // Fallback to mock data on error
    return {
      city: city.charAt(0).toUpperCase() + city.slice(1),
      temperature: 7,
      condition: "overcast clouds (using fallback data)",
      forecast: ["6°C light rain", "8°C partly cloudy", "5°C clear sky"]
    };
  }
};

/**
 * GET /api/weather-subscription?city=:city&address=:address
 * Returns weather if active subscription, otherwise HTTP 402
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "GET") {
    return handleGetRequest(req, res);
  } else if (req.method === "POST") {
    return handlePostRequest(req, res);
  } else if (req.method === "DELETE") {
    return handleDeleteRequest(req, res);
  } else {
    return res.status(405).json({ error: "Method not allowed" });
  }
}

/**
 * GET: Check subscription and return weather data
 */
async function handleGetRequest(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { city, address } = req.query;
  
  if (!city || typeof city !== "string") {
    return res.status(400).json({ error: "City parameter required" });
  }

  if (!address || typeof address !== "string") {
    return res.status(400).json({ error: "Address parameter required" });
  }

  const userAddress = ethers.getAddress(address.toLowerCase());

  // Check for active subscription
  const subscription = subscriptions.get(userAddress);
  const now = Date.now();

  if (!subscription) {
    // No subscription - return HTTP 402
    return res.status(402).json({
      paymentRequired: true,
      subscriptionRequired: true,
      message: "Active subscription required to access weather data",
      plans: Object.entries(PLANS).map(([key, plan]) => ({
        id: key,
        name: plan.name,
        price: parseInt(plan.price) / 1_000_000,
        currency: "USDC",
        duration: plan.duration / (24 * 60 * 60 * 1000) + " days",
        requestLimit: plan.requestLimit,
      })),
      instructions: {
        step1: "Choose a subscription plan",
        step2: "POST to /api/weather-subscription with plan and txHash",
        step3: "GET requests will work for subscription period",
      },
    });
  }

  // Check if subscription expired
  if (now > subscription.expiryDate) {
    // Subscription expired - return HTTP 402
    return res.status(402).json({
      paymentRequired: true,
      subscriptionExpired: true,
      message: "Your subscription has expired",
      expiredDate: new Date(subscription.expiryDate).toISOString(),
      plans: Object.entries(PLANS).map(([key, plan]) => ({
        id: key,
        name: plan.name,
        price: parseInt(plan.price) / 1_000_000,
        currency: "USDC",
      })),
    });
  }

  // Check request limit
  if (subscription.requestCount >= PLANS[subscription.plan as keyof typeof PLANS].requestLimit) {
    return res.status(429).json({
      error: "Request limit exceeded for this subscription",
      requestCount: subscription.requestCount,
      limit: PLANS[subscription.plan as keyof typeof PLANS].requestLimit,
      message: "Please upgrade your plan",
    });
  }

  // Active subscription - return weather data
  subscription.requestCount++;
  subscription.lastRequestDate = now;
  subscriptions.set(userAddress, subscription);

  const weather = await getWeatherData(city);
  const daysRemaining = Math.ceil((subscription.expiryDate - now) / (24 * 60 * 60 * 1000));

  return res.status(200).json({
    success: true,
    subscription: {
      plan: subscription.plan,
      expiryDate: new Date(subscription.expiryDate).toISOString(),
      daysRemaining,
      requestCount: subscription.requestCount,
      requestLimit: PLANS[subscription.plan as keyof typeof PLANS].requestLimit,
    },
    weather: weather,
    message: `${weather.temperature}°C, ${weather.condition}`,
  });
}

/**
 * POST: Create subscription with payment proof
 */
async function handlePostRequest(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { address, txHash, plan } = req.body;

  if (!address || !txHash || !plan) {
    return res.status(400).json({
      error: "Missing required fields",
      required: ["address", "txHash", "plan"],
    });
  }

  if (!PLANS[plan as keyof typeof PLANS]) {
    return res.status(400).json({
      error: "Invalid plan",
      availablePlans: Object.keys(PLANS),
    });
  }

  const userAddress = ethers.getAddress(address.toLowerCase());

  // Verify transaction on-chain
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  
  try {
    const receipt = await provider.getTransactionReceipt(txHash);
    
    if (!receipt || receipt.status !== 1) {
      return res.status(400).json({
        error: "Invalid payment transaction",
        txHash,
        status: receipt?.status || "not_found",
      });
    }

    // Check if already has active subscription
    const existing = subscriptions.get(userAddress);
    const now = Date.now();
    
    if (existing && now < existing.expiryDate) {
      return res.status(400).json({
        error: "You already have an active subscription",
        expiryDate: new Date(existing.expiryDate).toISOString(),
      });
    }

    // Create subscription
    const selectedPlan = PLANS[plan as keyof typeof PLANS];
    const subscription = {
      address: userAddress,
      plan: plan,
      startDate: now,
      expiryDate: now + selectedPlan.duration,
      txHash,
      requestCount: 0,
      lastRequestDate: now,
    };

    subscriptions.set(userAddress, subscription);

    return res.status(200).json({
      success: true,
      message: "Subscription created successfully",
      subscription: {
        plan: subscription.plan,
        planName: selectedPlan.name,
        startDate: new Date(subscription.startDate).toISOString(),
        expiryDate: new Date(subscription.expiryDate).toISOString(),
        daysRemaining: Math.ceil(selectedPlan.duration / (24 * 60 * 60 * 1000)),
        requestLimit: selectedPlan.requestLimit,
      },
      payment: {
        txHash,
        amount: parseInt(selectedPlan.price) / 1_000_000,
        currency: "USDC",
      },
    });

  } catch (error: any) {
    console.error("Payment verification error:", error);
    return res.status(500).json({
      error: "Payment verification failed",
      details: error.message,
    });
  }
}

/**
 * DELETE: Cancel subscription
 */
async function handleDeleteRequest(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { address } = req.query;

  if (!address || typeof address !== "string") {
    return res.status(400).json({ error: "Address parameter required" });
  }

  const userAddress = ethers.getAddress(address.toLowerCase());

  if (!subscriptions.has(userAddress)) {
    return res.status(404).json({ error: "No subscription found" });
  }

  subscriptions.delete(userAddress);

  return res.status(200).json({
    success: true,
    message: "Subscription cancelled",
  });
}

