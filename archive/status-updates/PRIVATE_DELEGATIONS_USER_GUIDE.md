# Private Delegations: User Guide

## 🎯 What You Get

**Private Delegations** lets you set up **automated payments** with **complete privacy**:

- ✅ Your agent pays bills automatically (no MetaMask popups!)
- ✅ Your payment rules are **completely private** (no one can see them)
- ✅ Your payments **cannot be linked together** (each payment looks independent)
- ✅ Your spending limits are **hidden** (only you know your budget)

---

## 🔐 Privacy Guarantees

### What Others Can See ⚠️

On the blockchain, observers can see:
- ✅ Individual payment amounts (needed for transactions)
- ✅ Which merchant receives payment (needed for routing)
- ✅ That an agent executed the payment (needed for automation)

### What Others Cannot See ✅

Observers **cannot** see:
- ❌ Your spending limits ("max $50/month")
- ❌ Your payment rules ("only weekdays", "only Netflix")
- ❌ That payments belong to the same subscription
- ❌ Your payment patterns (how often, when, why)
- ❌ Your policy rules (stored in Nillion TEE)

---

## 🚀 How It Works (Simple Version)

1. **You Set Rules Privately**
   - "Pay Netflix $10/month"
   - "Max $50/month total"
   - Rules stored in Nillion (encrypted, private)

2. **Agent Executes Payments**
   - Agent automatically pays when due
   - No MetaMask popups needed!
   - No user interaction required

3. **Verification Happens Privately**
   - Nillion checks: "Does this payment comply with rules?"
   - If yes: Attestation is generated
   - Blockchain verifies attestation (not the rules!)

4. **Payment Executes**
   - Merchant receives payment
   - Rules remain private
   - Payment cannot be linked to previous ones

---

## 🆚 Why This is Better

### vs. Traditional Subscriptions

**Traditional:**
- ❌ Credit card stored with merchant (security risk)
- ❌ Manual approval each payment (annoying)
- ❌ No privacy (merchant knows everything)

**Private Delegations:**
- ✅ No stored credit card
- ✅ Automatic payments
- ✅ Complete privacy

### vs. Regular Agent Setups

**Regular Agent:**
- ⚠️ Rules visible on blockchain
- ⚠️ Payments can be linked
- ⚠️ Patterns observable

**Private Delegations:**
- ✅ Rules hidden (Nillion TEE)
- ✅ Payments unlinkable
- ✅ Patterns hidden

---

## 💡 Real Example

**You want to pay:**
- Netflix: $10/month
- Spotify: $15/month
- Max total: $50/month

**With Private Delegations:**

**What blockchain shows:**
```
Payment 1: Agent 0xABC → Netflix $10 (noteId: 0x123...)
Payment 2: Agent 0xDEF → Spotify $15 (noteId: 0x456...)
Payment 3: Agent 0xGHI → Netflix $10 (noteId: 0x789...)
```

**What observers see:**
- ✅ Individual payment amounts
- ❌ Cannot link payments together
- ❌ Cannot see spending limits
- ❌ Cannot see subscription relationships

**What you know:**
- ✅ All payments are from your agent
- ✅ All payments follow your private rules
- ✅ Your $50/month limit is enforced (privately)

---

## 🎉 Summary

**Private Delegations** gives you:
1. **Automation** - Agent pays automatically (no interaction needed)
2. **Privacy** - Rules hidden in Nillion TEE (not on blockchain)
3. **Unlinkability** - Payments cannot be linked together
4. **Control** - You set rules privately, agent executes them

**Result**: Automated payments with cash-level privacy, but with blockchain security! 🚀

---

For technical details, see `PRIVATE_DELEGATIONS_EXPLAINED.md`







