# HTTP 402 Demo - Privacy Explained

## 🔒 What's Private vs Public

### ✅ What Stays PRIVATE (ZK-Protected):

1. **Shielded Balance** - Your total funds are hidden
2. **Transaction History** - Past payments are unlinkable  
3. **Payment Sources** - Which notes you spent from
4. **Internal Amounts** - The ZK circuit hides the actual note amounts

### 👁️ What's PUBLIC (Required for HTTP 402):

1. **Your Wallet Address** - The server needs to know WHO is paying
2. **Payment Amount** - The server needs to verify you paid the CORRECT amount
3. **Subscription Status** - The server tracks if your subscription is active

---

## Why Is This Necessary?

### HTTP 402 Pattern Requirements:

```
CLIENT                    SERVER
   │                         │
   │  GET /api/weather       │
   ├────────────────────────>│
   │                         │
   │  HTTP 402 (Need 1 USDC) │
   │<────────────────────────┤
   │  + address=0xe02E9F...  │  ← Server needs YOUR address
   │                         │
   │  PAY 1 USDC on-chain    │
   │  + ZK proof             │
   ├────────────────────────>│
   │                         │
   │  Verify: Did 0xe02E9F   │  ← Server checks YOUR payment
   │  pay 1 USDC? ✅         │
   │                         │
   │  HTTP 200 + Weather     │
   │<────────────────────────┤
```

**The server MUST know:**
- WHO paid (your address)
- HOW MUCH they paid
- WHEN the payment was made

**Otherwise it can't provide the service!**

---

## What Privacy DO You Get?

### 🎯 Privacy Benefits with ZK Proofs:

1. **Balance Privacy**
   - ❌ Server doesn't see: "User has 10,000 USDC"
   - ✅ Server only sees: "User paid 1 USDC" (nothing more)

2. **Source Privacy**
   - ❌ Server doesn't see: "Payment came from note #123 funded by Binance"
   - ✅ Server only sees: "Valid ZK proof for 1 USDC"

3. **History Privacy**
   - ❌ Server doesn't see: "User paid 10 other merchants today"
   - ✅ Server only sees: "This single payment to us"

4. **Future Privacy**
   - ❌ Server doesn't see: "User can afford 100 more payments"
   - ✅ Server only sees: "This one payment happened"

---

## Comparison: HTTP 402 vs Traditional Payment

### Traditional Payment (e.g., Credit Card):
```
Merchant sees:
- Your name
- Card number
- Billing address
- Payment history
- Available credit limit
- Card issuer
```

### HTTP 402 with ZK Proofs:
```
Merchant sees:
- Your wallet address (0xe02E9F...)
- This specific payment (1 USDC)
- Nothing else!
```

---

## Full Privacy Option: Shielded Merchant Address

If you want MAXIMUM privacy, use `merchantCommitment`:

```typescript
{
  merchantCommitment: "0xabc123..."  // Merchant's shielded address
}
```

**This hides:**
- ✅ Which merchant you paid
- ✅ The payment recipient
- ✅ The relationship between you and merchant

**See:** `SHIELDED_MERCHANT_GUIDE.md` for setup

---

## Summary

| Information | Visible to Server? | Protected by ZK? |
|------------|-------------------|------------------|
| User wallet address | ✅ Yes (required) | ❌ No |
| Payment amount | ✅ Yes (required) | ❌ No |
| User's total balance | ❌ No | ✅ Yes |
| Payment source notes | ❌ No | ✅ Yes |
| Past transactions | ❌ No | ✅ Yes |
| Future spending power | ❌ No | ✅ Yes |

**TL;DR:** The server sees ONLY what's needed for this specific payment.  
Your overall financial privacy remains protected by ZK proofs! 🔒







