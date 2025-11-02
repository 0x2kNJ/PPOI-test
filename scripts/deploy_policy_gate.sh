#!/bin/sh
# the anvil container only has plain sh, not bash

. /baanx/demo/.env

mkdir -p /baanx/demo/out

# Deploy the SimplePolicyGate contract
r="$(
  forge create \
    --no-cache \
    --root /baanx/demo \
    --out /baanx/demo/out \
    --broadcast \
    --private-key $ANVIL_ALICE_PRIVATE_KEY \
    --rpc-url http://anvil:8545 \
    /baanx/demo/contracts/SimplePolicyGate.sol:SimplePolicyGate
)"
policypass_adrs=$(echo "$r" | grep 'Deployed to:' | grep -o '0x.*')
echo "POLICY_GATE_ADDRESS=$policypass_adrs"




