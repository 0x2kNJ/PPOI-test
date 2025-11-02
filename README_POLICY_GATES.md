# Demo: Simple Policy Gate (Max Tx + Daily Limit)

## Overview
Adds a minimal, non-custodial Policy Gate to the existing demo:
- Contract: `SimplePolicyGate.sol` (per-user max-transaction and daily limits)
- Backend: optional validation before calling existing withdraw flow
- UI: simple form to set policy when a `POLICY_GATE_ADDRESS` is provided

## Deploy

Using the existing docker compose flow, the contract is deployed by `deploy_all.sh`.
If running manually:

```bash
forge create \
  --root demo \
  --broadcast \
  --private-key $ANVIL_ALICE_PRIVATE_KEY \
  --rpc-url http://localhost:8545 \
  demo/contracts/SimplePolicyGate.sol:SimplePolicyGate
```

Record the address as `POLICY_GATE_ADDRESS`.

## Configure Backend

Set env variables for the mock backend (compose already passes RPC_URL):

```bash
export POLICY_GATE_ADDRESS=0x...   # from deployment
export ANVIL_OPERATOR_PRIVATE_KEY=0x...  # any funded key for sending consume()
```

Then start the stack (from `demo/`):

```bash
docker compose up --build
```

## Configure UI

Option A (window injection): open the UI and set in console:

```js
window.POLICY_GATE_ADDRESS = '0x...'
```

Option B (sdk config): if your sdk exposes config, set `config.policyGate` to the address.

## Use

1) Set policy in the UI box “Policy Gate”:
- Max per-transaction (USDC units)
- Daily limit (USDC units)

2) Simulate payments as usual. If a policy is configured, backend will:
- Call `policy.check(user, amount)` before withdraw
- If OK, proceed with existing `sdk.baanx.withdraw`
- Fire-and-forget `policy.consume(user, amount)` after 202 response

## Notes

- Non-custodial: only the user (policy owner) can call `setPolicy` for their own address.
- Demo-security: `consume()` is open; restrict to backend/operator in production.
- Gas impact is minimal for the simple checks used here.

## Files

- `contracts/SimplePolicyGate.sol`: On-chain limits per user
- `mock-backend/src/policy.ts`: Thin client for `check/consume`
- `mock-backend/src/main.ts`: Optional policy validation path
- `ui/src/components/PolicyForm.tsx`: Simple UI to set policy from the wallet
- `scripts/deploy_policy_gate.sh`: Deployment helper

## Next Steps

- Add time windows, weekends, or merchant allowlist
- Bind policy to Safe module when migrating to smart accounts
- Add signature-based off-chain policy updates relayed by backend


