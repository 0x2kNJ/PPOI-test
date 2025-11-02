#!/bin/sh
# the anvil container only has plain sh, not bash

. /baanx/demo/.env

RPC=${RPC:-http://anvil:8545}
FROM=${FROM:-$ANVIL_ALICE_ADDRESS}

mkdir -p /baanx/demo/out
log=$(mktemp)

# Example 1yr validity period in seconds
NAME_REGISTRATION_TERM=$((60*60*24*365))
ZERO_ADRS=0x0000000000000000000000000000000000000000

# Deploy the transact verifier
r="$(
  forge create \
    --optimizer-runs 200 \
    --no-cache \
    --out /baanx/demo/out \
    --broadcast \
    --private-key $ANVIL_ALICE_PRIVATE_KEY \
    --rpc-url "$RPC" \
    /baanx/demo/lib/stx-circuit/HonkVerifier2x2.sol:HonkVerifier
)"
transact_verifier_adrs=$(echo "$r" | grep 'Deployed to:' | grep -o '0x.*')
echo "TRANSACT_VERIFIER_ADDRESS=$transact_verifier_adrs" >> $log

# Deploy the reserve verifier
r="$(
  forge create \
    --optimizer-runs 200 \
    --no-cache \
    --out /baanx/demo/out \
    --broadcast \
    --private-key $ANVIL_ALICE_PRIVATE_KEY \
    --rpc-url "$RPC" \
    /baanx/demo/lib/reserve-circuit/HonkVerifier.sol:HonkVerifier
)"
reserve_verifier_adrs=$(echo "$r" | grep 'Deployed to:' | grep -o '0x.*')
echo "RESERVE_VERIFIER_ADDRESS=$reserve_verifier_adrs" >> $log

# Deploy the precompute verifier
r="$(
  forge create \
    --optimizer-runs 200 \
    --no-cache \
    --out /baanx/demo/out \
    --broadcast \
    --private-key $ANVIL_ALICE_PRIVATE_KEY \
    --rpc-url "$RPC" \
    /baanx/demo/lib/precompute-circuit/HonkVerifier.sol:HonkVerifier
)"
precompute_verifier_adrs=$(echo "$r" | grep 'Deployed to:' | grep -o '0x.*')
echo "PRECOMPUTE_VERIFIER_ADDRESS=$precompute_verifier_adrs" >> $log

# Deploy the rebucket verifier
r="$(
  forge create \
    --optimizer-runs 200 \
    --no-cache \
    --out /baanx/demo/out \
    --broadcast \
    --private-key $ANVIL_ALICE_PRIVATE_KEY \
    --rpc-url "$RPC" \
    /baanx/demo/lib/stx-circuit/HonkVerifier2x20.sol:HonkVerifier
)"
rebucket_verifier_adrs=$(echo "$r" | grep 'Deployed to:' | grep -o '0x.*')
echo "REBUCKET_VERIFIER_ADDRESS=$rebucket_verifier_adrs" >> $log

# Deploy mock WETH contract
r="$(
  forge create \
    --no-cache \
    --root /baanx/demo \
    --out /baanx/demo/out \
    --broadcast \
    --private-key $ANVIL_ALICE_PRIVATE_KEY \
    --rpc-url http://anvil:8545 \
    /baanx/demo/mocks/MockWETH.sol:MockWETH
)"
mockweth_adrs=$(echo "$r" | grep 'Deployed to:' | grep -o '0x.*')
echo "MOCK_WETH_ADDRESS=$mockweth_adrs"

# Build & deploy Poseidon2 (Huff impl + Solidity wrapper)
extract_addr() {
  out=$(cat)
  if command -v jq >/dev/null 2>&1; then
    addr=$(printf '%s' "$out" | jq -er '.contractAddress // empty' 2>/dev/null || true)
    if [ -n "$addr" ]; then
      printf '%s\n' "$addr"
      return 0
    fi
  fi
  printf '%s' "$out" | grep -o '0x[0-9a-fA-F]\{40\}' | head -n1 || true
  return 0
}

cd /baanx/demo/lib/poseidon2-compression-huff
huffc src/huff/main.huff -b -e shanghai > /tmp/huff.hex
poseidon2_impl_adrs=$(cast send \
  --rpc-url "$RPC" \
  --unlocked \
  --from "$FROM" \
  --create 0x$(cat /tmp/huff.hex) \
  --json | extract_addr)
echo "POSEIDON2_IMPL_ADDRESS=$poseidon2_impl_adrs" >> $log

forge build -q
wrapper_json=out/Poseidon2T2Wrapper.sol/Poseidon2T2Wrapper.json
CODE=$(jq -r '.bytecode.object' "$wrapper_json")
ARGS=$(cast abi-encode 'constructor(address)' "$poseidon2_impl_adrs")
poseidon2_wrapper_adrs=$(cast send \
  --rpc-url "$RPC" \
  --unlocked \
  --from "$FROM" \
  --create ${CODE}${ARGS#0x} \
  --json | extract_addr)
echo "POSEIDON2_WRAPPER_ADDRESS=$poseidon2_wrapper_adrs" >> $log

linked_impl=$(cast call --rpc-url "$RPC" "$poseidon2_wrapper_adrs" "impl()(address)" || true)
echo "POSEIDON2_WRAPPER_IMPL_LINK=$linked_impl" >> $log
smoke_hash2=$(cast call --rpc-url "$RPC" "$poseidon2_wrapper_adrs" "hash_2(uint256,uint256)(uint256)" 0 1 || true)
echo "POSEIDON2_SMOKE_HASH2_0_1=$smoke_hash2" >> $log

cd /baanx/demo

# Prepare the pool ctor args
pool_ctor_args_file=$(mktemp)
mv $pool_ctor_args_file $pool_ctor_args_file.json
pool_ctor_args_file=$pool_ctor_args_file.json
# The last param is Poseidon2 wrapper link.
echo "[ \
  \"$transact_verifier_adrs\", \
  \"$ZERO_ADRS\", \
  \"$reserve_verifier_adrs\", \
  \"$precompute_verifier_adrs\", \
  \"$rebucket_verifier_adrs\", \
  \"0x0000000000000000000000000000000000000000000000000000000000000017\", \
  \"$ANVIL_ALICE_ADDRESS\", \
  \"$mockweth_adrs\", \
  \"$poseidon2_wrapper_adrs\" \
]" > $pool_ctor_args_file

# Install the pool repo deps
cd /baanx/demo/lib/pool
forge install --shallow --quiet --no-git --root /baanx/demo/lib/pool

# Deploy the Bermuda pool
r="$(
  forge create \
    --constructor-args-path $pool_ctor_args_file \
    --optimizer-runs 200 \
    --no-cache \
    --out /baanx/demo/out \
    --skip Mock \
    --broadcast \
    --private-key $ANVIL_ALICE_PRIVATE_KEY \
    --rpc-url "$RPC" \
    /baanx/demo/lib/pool/src/BermudaPool.sol:BermudaPool
)"
pool_adrs=$(echo "$r" | grep 'Deployed to:' | grep -o '0x.*')
echo "POOL_ADDRESS=$pool_adrs" >> $log

# Install the registry repo deps
cd /baanx/demo/lib/registry
forge install --shallow --quiet --no-git --root /baanx/demo/lib/registry

# Prepare the registry ctor args
registry_ctor_args_file=$(mktemp)
mv $registry_ctor_args_file $registry_ctor_args_file.json
registry_ctor_args_file=$registry_ctor_args_file.json
# First param is zeroed as we won't do payable name registrations here
echo "[ \
  \"$ZERO_ADRS\", \
  \"$ZERO_ADRS\", \
  \"$ANVIL_ALICE_ADDRESS\", \
  \"$NAME_REGISTRATION_TERM\", \
  \"0x0000000000000000000000000000000000000000000000000000000000000000\", \
  \"0x0000000000000000000000000000000000000000000000000000000000000000\", \
  \"0x0000000000000000000000000000000000000000000000000000000000000000\" \
]" > $registry_ctor_args_file

# Deploy the Bermuda registry
r="$(
  forge create \
    --constructor-args-path $registry_ctor_args_file \
    --no-cache \
    --out /baanx/demo/out \
    --broadcast \
    --private-key $ANVIL_ALICE_PRIVATE_KEY \
    --rpc-url "$RPC" \
    /baanx/demo/lib/registry/src/Registry.sol:Registry
)"
registry_adrs=$(echo "$r" | grep 'Deployed to:' | grep -o '0x.*')
echo "REGISTRY_ADDRESS=$registry_adrs" >> $log

cat $log
