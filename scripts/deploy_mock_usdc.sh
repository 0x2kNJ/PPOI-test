#!/bin/sh
# the anvil container only has plain sh, not bash

. /baanx/demo/.env

mkdir -p /baanx/demo/out

# Deploy the mock USDC contract
r="$(
  forge create \
    --no-cache \
    --root /baanx/demo \
    --out /baanx/demo/out \
    --broadcast \
    --private-key $ANVIL_ALICE_PRIVATE_KEY \
    --rpc-url http://anvil:8545 \
    /baanx/demo/mocks/MockUSDC.sol:MockUSDC
)"
mockusdc_adrs=$(echo "$r" | grep 'Deployed to:' | grep -o '0x.*')
echo "MOCK_USDC_ADDRESS=$mockusdc_adrs"
