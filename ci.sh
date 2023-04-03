anvil --chain-id 31337 -p 8545 > /dev/null &
ANVIL_1_PID=$!

anvil --chain-id 31338 -p 8555 > /dev/null &
ANVIL_2_PID=$!

sleep 1

set -e


DEBUG=hyperlane* yarn ts-node scripts/deploy.ts --local anvil1 --remotes anvil2 --key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --no-write-agent-config
DEBUG=hyperlane* yarn ts-node scripts/deploy.ts --local anvil2 --remotes anvil1 --key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

cat artifacts/addresses.json
cat artifacts/agent_config.json

docker run --mount type=bind,source="$(pwd)/artifacts/agent_config.json",target=/config/agent_config.json,readonly -e CONFIG_FILES=/config/agent_config.json -e HYP_VALIDATOR_ORIGINCHAINNAME=anvil1 -e HYP_VALIDATOR_REORGPERIOD=1 -e HYP_VALIDATOR_INTERVAL=1 -e HYP_BASE_CHAINS_ANVIL1_CONNECTION_URL=http://localhost:8545 -e HYP_VALIDATOR_VALIDATOR_TYPE=hexKey -e HYP_VALIDATOR_VALIDATOR_KEY=0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6 -e HYP_VALIDATOR_CHECKPOINTSYNCER_TYPE=localStorage -e HYP_VALIDATOR_CHECKPOINTSYNCER_PATH=/tmp/anvil-1-sigs -e HYP_BASE_TRACING_LEVEL=info -e HYP_BASE_TRACING_FMT=pretty gcr.io/abacus-labs-dev/hyperlane-agent:5bf8aed-20230323-140136 ./validator
docker run --mount type=bind,source="$(pwd)/artifacts/agent_config.json",target=/config/agent_config.json,readonly -e CONFIG_FILES=/config/agent_config.json -e HYP_VALIDATOR_ORIGINCHAINNAME=anvil2 -e HYP_VALIDATOR_REORGPERIOD=1 -e HYP_VALIDATOR_INTERVAL=1 -e HYP_BASE_CHAINS_ANVIL1_CONNECTION_URL=http://localhost:8555 -e HYP_VALIDATOR_VALIDATOR_TYPE=hexKey -e HYP_VALIDATOR_VALIDATOR_KEY=0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6 -e HYP_VALIDATOR_CHECKPOINTSYNCER_TYPE=localStorage -e HYP_VALIDATOR_CHECKPOINTSYNCER_PATH=/tmp/anvil-2-sigs -e HYP_BASE_TRACING_LEVEL=info -e HYP_BASE_TRACING_FMT=pretty gcr.io/abacus-labs-dev/hyperlane-agent:6bf8aed-20230323-140136 ./validator



#DEBUG=hyperlane* yarn ts-node scripts/test.ts --chains anvil1 anvil2 --key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --timeout 10

kill $ANVIL_1_PID
kill $ANVIL_2_PID
