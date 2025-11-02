#!/bin/sh
# the anvil container only has plain sh, not bash

. /baanx/demo/.env

mkdir -p /baanx/demo/out
log=$(mktemp)

# Example gas limit used by Baanx: 200_000
TRANSFER_FROM_GAS_LIMIT=0x0000000000000000000000000000000000000000000000000000000000030d40
# Some functions don't accept zero addresses so then:
BOGUS_ADRS=0x0000000000000000000000000000000000000001

# Prepare the FoxConnectUS ctor args
foxconnectus_ctor_args_file=$(mktemp)
mv $foxconnectus_ctor_args_file $foxconnectus_ctor_args_file.json
foxconnectus_ctor_args_file=$foxconnectus_ctor_args_file.json
echo "[\"$ANVIL_BOB_ADDRESS\",\"$ANVIL_CHARLIE_ADDRESS\",\"$TRANSFER_FROM_GAS_LIMIT\"]" > $foxconnectus_ctor_args_file

# Deploy the FoxConnectUS contract
# forge's --constructor-args(-path) option has issues, fx tripping on valid 
# JSON, shadowing the contract path arg leading to dead-end errors...
# So we created a MockFoxConnectUS contract that simplifies its ctor args by
# only passing those required for use of the withdraw() function.
r="$(
  forge create \
    --constructor-args-path $foxconnectus_ctor_args_file \
    --optimizer-runs 200 \
    --via-ir \
    --no-cache \
    --root /baanx/demo \
    --out /baanx/demo/out \
    --broadcast \
    --private-key $ANVIL_ALICE_PRIVATE_KEY \
    --rpc-url http://anvil:8545 \
    /baanx/demo/mocks/MockFoxConnectUS.sol:MockFoxConnectUS
)"
foxconnectus_adrs=$(echo "$r" | grep 'Deployed to:' | grep -o '0x.*')
echo "FOXCONNECTUS_ADDRESS=$foxconnectus_adrs" >> $log

echo "OPERATOR_ADDRESS=$ANVIL_BOB_ADDRESS" >> $log
echo "BENEFICIARY_ADDRESS=$ANVIL_CHARLIE_ADDRESS" >> $log
cat $log