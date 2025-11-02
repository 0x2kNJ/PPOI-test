#!/bin/sh

set -eu
. /baanx/demo/.env

echo "Deploying contracts..."

sh /baanx/demo/scripts/deploy_bermuda.sh
sh /baanx/demo/scripts/deploy_foxconnectus.sh
sh /baanx/demo/scripts/deploy_mock_usdc.sh

