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

mkdir ./artifacts/anvil1 ./artifacts/anvil1/validator ./artifacts/anvil1/relayer
chmod 777 ./artifacts/anvil1 -R
mkdir ./artifacts/anvil2 ./artifacts/anvil2/validator ./artifacts/anvil2/relayer
chmod 777 ./artifacts/anvil2 -R

docker run --mount type=bind,source="$(pwd)/artifacts",target=/config -e CONFIG_FILES=/config/agent_config.json -e HYP_VALIDATOR_ORIGINCHAINNAME=anvil1 -e HYP_VALIDATOR_REORGPERIOD=1 -e HYP_VALIDATOR_INTERVAL=1 -e HYP_BASE_CHAINS_ANVIL1_CONNECTION_URL=http://127.0.0.1:8545 -e HYP_VALIDATOR_VALIDATOR_TYPE=hexKey -e HYP_VALIDATOR_VALIDATOR_KEY=0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6 -e HYP_VALIDATOR_CHECKPOINTSYNCER_TYPE=localStorage -e HYP_VALIDATOR_CHECKPOINTSYNCER_PATH=/config/anvil1/validator -e HYP_BASE_TRACING_LEVEL=info -e HYP_BASE_TRACING_FMT=pretty gcr.io/abacus-labs-dev/hyperlane-agent:5bf8aed-20230323-140136 ./validator
docker run --mount type=bind,source="$(pwd)/artifacts",target=/config -e CONFIG_FILES=/config/agent_config.json -e HYP_VALIDATOR_ORIGINCHAINNAME=anvil2 -e HYP_VALIDATOR_REORGPERIOD=1 -e HYP_VALIDATOR_INTERVAL=1 -e HYP_BASE_CHAINS_ANVIL2_CONNECTION_URL=http://127.0.0.1:8555 -e HYP_VALIDATOR_VALIDATOR_TYPE=hexKey -e HYP_VALIDATOR_VALIDATOR_KEY=0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6 -e HYP_VALIDATOR_CHECKPOINTSYNCER_TYPE=localStorage -e HYP_VALIDATOR_CHECKPOINTSYNCER_PATH=/config/anvil2/validator -e HYP_BASE_TRACING_LEVEL=info -e HYP_BASE_TRACING_FMT=pretty gcr.io/abacus-labs-dev/hyperlane-agent:5bf8aed-20230323-140136 ./validator

#docker run -it --mount type=bind,source="$(pwd)/artifacts",target=/config -e CONFIG_FILES=/config/agent_config.json -e HYP_BASE_CHAINS_ANVIL1_CONNECTION_URL=http://127.0.0.1:8545 -e HYP_BASE_CHAINS_ANVIL2_CONNECTION_URL=http://127.0.0.1:8555 -e HYP_BASE_TRACING_LEVEL=info -e HYP_BASE_TRACING_FMT=pretty -e HYP_RELAYER_ORIGINCHAINNAME=anvil1 -e HYP_RELAYER_DESTINATIONCHAINNAMES=anvil2 -e HYP_RELAYER_ALLOWLOCALCHECKPOINTSYNCERS=true -e HYP_RELAYER_DB=/config/anvil1/relayer -e HYP_RELAYER_GASPAYMENTENFORCEMENT='[{"type":"none"}]' -e HYP_BASE_CHAINS_ANVIL2_SIGNER_TYPE=hexKey -e HYP_BASE_CHAINS_ANVIL2_SIGNER_KEY=0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97 gcr.io/abacus-labs-dev/hyperlane-agent:5bf8aed-20230323-140136 ./relayer



#DEBUG=hyperlane* yarn ts-node scripts/test.ts --chains anvil1 anvil2 --key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --timeout 10

kill $ANVIL_1_PID
kill $ANVIL_2_PID
