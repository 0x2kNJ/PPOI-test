# OpenWeather API Integration - Real Weather Data

The HTTP 402 demo now supports **REAL weather data** from OpenWeather API!

---

## 🌤️ Setup Instructions

### Step 1: Get Free API Key

1. **Sign up:** https://home.openweathermap.org/users/sign_up
2. **Subscribe to "One Call by Call":** 
   - Go to https://openweathermap.org/price
   - Scroll to "One Call API 3.0"
   - Click "Get API key" (includes **1,000 calls/day FREE**)
3. **Copy your API key** from https://home.openweathermap.org/api_keys

---

### Step 2: Add API Key to Environment

Add to `demo/apps/merchant-demo/.env.local`:

```bash
# OpenWeather API Key (for real weather data)
OPENWEATHER_API_KEY=your_api_key_here
```

**Example:**
```bash
OPENWEATHER_API_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

---

### Step 3: Restart Next.js Server

```bash
# Kill the current server (Ctrl+C in the terminal)
# Restart it:
cd demo/apps/merchant-demo
npm run dev
```

---

## ✅ How It Works

### With API Key (Real Data):
```
User → GET /api/weather?city=hamburg
Server → Calls OpenWeather API
OpenWeather → Returns actual temperature
Server → Returns: "7°C, light rain" ✅ REAL DATA
```

### Without API Key (Fallback):
```
User → GET /api/weather?city=hamburg
Server → No API key found
Server → Returns: "24°C, bewölkt" ❌ MOCK DATA
Server logs: "⚠️ OPENWEATHER_API_KEY not set, using mock data"
```

---

## 🌍 Supported Cities

Currently configured coordinates:
- **Hamburg** (53.5511°N, 9.9937°E)
- **Berlin** (52.5200°N, 13.4050°E)
- **Munich** (48.1351°N, 11.5820°E)

Want more cities? Add them to `CITY_COORDS` in the API code.

---

## 📊 API Usage

OpenWeather One Call API 3.0 provides:
- ✅ **Current weather** (temperature, condition, humidity, wind, etc.)
- ✅ **FREE tier:** 1,000 calls/day
- ✅ **Updated every 10 minutes**

According to [OpenWeather documentation](https://openweathermap.org/api/one-call-3):
> "One Call API 3.0 is based on the proprietary OpenWeather Model and is updated every 10 minutes."

---

## 🔍 Check If It's Working

### Server Logs:
```
✅ Real weather data for hamburg: 7°C, light rain
```

vs

```
⚠️ OPENWEATHER_API_KEY not set, using mock data
```

### Browser Response:
With real API:
```json
{
  "weather": {
    "city": "Hamburg",
    "temperature": 7,
    "condition": "light rain"
  }
}
```

---

## 💰 Pricing

**Free Tier:** 1,000 calls/day = FREE

For the demo:
- Each weather request = 1 API call
- 1,000 requests/day is plenty for testing!

If you need more: https://openweathermap.org/price

---

## 🔒 Security Note

**Never commit your API key to git!**

The `.env.local` file is already in `.gitignore` to protect your key.

---

## 🎯 Summary

1. ✅ **Sign up** → https://home.openweathermap.org/users/sign_up
2. ✅ **Subscribe** → "One Call by Call" (FREE)
3. ✅ **Add key** → `OPENWEATHER_API_KEY=...` in `.env.local`
4. ✅ **Restart** → `npm run dev`
5. ✅ **Test** → Pay & request weather → See REAL data!

Now your HTTP 402 demo shows **actual real-time weather**! 🌤️🚀







