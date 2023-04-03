mkdir ./artifacts/anvil1 ./artifacts/anvil1/state ./artifacts/anvil1/validator ./artifacts/anvil1/relayer
chmod 777 ./artifacts/anvil1 -R
mkdir ./artifacts/anvil2 ./artifacts/anvil2/state ./artifacts/anvil2/validator ./artifacts/anvil2/relayer
chmod 777 ./artifacts/anvil2 -R

anvil --chain-id 31337 -p 8545 --state ./artifacts/anvil1/state > /dev/null &
ANVIL_1_PID=$!

anvil --chain-id 31338 -p 8555 --state ./artifacts/anvil2/state > /dev/null &
ANVIL_2_PID=$!

sleep 1

set -e

DEBUG=hyperlane* yarn ts-node scripts/deploy.ts --local anvil1 --remotes anvil2 --key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --no-write-agent-config
DEBUG=hyperlane* yarn ts-node scripts/deploy.ts --local anvil2 --remotes anvil1 --key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

#kill $ANVIL_1_PID
#kill $ANVIL_2_PID

cat artifacts/addresses.json
cat artifacts/agent_config.json

docker run --mount type=bind,source="$(pwd)/artifacts",target=/config --net=host -e CONFIG_FILES=/config/agent_config.json -e HYP_VALIDATOR_ORIGINCHAINNAME=anvil1 -e HYP_VALIDATOR_REORGPERIOD=1 -e HYP_VALIDATOR_INTERVAL=1 -e HYP_BASE_CHAINS_ANVIL1_CONNECTION_URL=http://127.0.0.1:8545 -e HYP_VALIDATOR_VALIDATOR_TYPE=hexKey -e HYP_VALIDATOR_VALIDATOR_KEY=0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6 -e HYP_VALIDATOR_CHECKPOINTSYNCER_TYPE=localStorage -e HYP_VALIDATOR_CHECKPOINTSYNCER_PATH=/config/anvil1/validator -e HYP_BASE_TRACING_LEVEL=info -e HYP_BASE_TRACING_FMT=pretty gcr.io/abacus-labs-dev/hyperlane-agent:5bf8aed-20230323-140136 ./validator
#docker run --mount type=bind,source="$(pwd)/artifacts",target=/config --network=host -e CONFIG_FILES=/config/agent_config.json -e HYP_VALIDATOR_ORIGINCHAINNAME=anvil2 -e HYP_VALIDATOR_REORGPERIOD=1 -e HYP_VALIDATOR_INTERVAL=1 -e HYP_BASE_CHAINS_ANVIL2_CONNECTION_URL=http://127.0.0.1:8555 -e HYP_VALIDATOR_VALIDATOR_TYPE=hexKey -e HYP_VALIDATOR_VALIDATOR_KEY=0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6 -e HYP_VALIDATOR_CHECKPOINTSYNCER_TYPE=localStorage -e HYP_VALIDATOR_CHECKPOINTSYNCER_PATH=/config/anvil2/validator -e HYP_BASE_TRACING_LEVEL=info -e HYP_BASE_TRACING_FMT=pretty gcr.io/abacus-labs-dev/hyperlane-agent:5bf8aed-20230323-140136 ./validator > validator2.logs &

#VALIDATOR_ANNOUNCE_ADDRESS=$(cat artifacts/addresses.json | jq '.anvil1.validatorAnnounce')
#VALIDATOR=$(cat artifacts/anvil1/validator/announcement.json | jq '.value.validator')
#STORAGE_LOCATION=$(cat artifacts/anvil1/validator/announcement.json | jq '.value.storage_location')
#SIGNATURE=$(cat artifacts/anvil1/validator/announcement.json | jq '.serialized_signature')
#cast send $VALIDATOR_ANNOUNCE_ADDRESS  "announce(address, string calldata, bytes calldata)(bool)" $VALIDATOR $STORAGE_LOCATION $SIGNATURE --rpc-url http://127.0.0.1:8545 --private-key 0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba


#VALIDATOR_ANNOUNCE_ADDRESS=$(cat artifacts/addresses.json | jq '.anvil2.validatorAnnounce')
#VALIDATOR=$(cat artifacts/anvil2/validator/announcement.json | jq '.value.validator')
#STORAGE_LOCATION=$(cat artifacts/anvil2/validator/announcement.json | jq '.value.storage_location')
#SIGNATURE=$(cat artifacts/anvil2/validator/announcement.json | jq '.serialized_signature')
#cast send $VALIDATOR_ANNOUNCE_ADDRESS  "announce(address, string calldata, bytes calldata)(bool)" $VALIDATOR $STORAGE_LOCATION $SIGNATURE --rpc-url http://127.0.0.1:8545 --private-key 0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba

# Need to announce...
#docker run -it --mount type=bind,source="$(pwd)/artifacts",target=/config -e CONFIG_FILES=/config/agent_config.json -e HYP_BASE_CHAINS_ANVIL1_CONNECTION_URL=http://127.0.0.1:8545 -e HYP_BASE_CHAINS_ANVIL2_CONNECTION_URL=http://127.0.0.1:8555 -e HYP_BASE_TRACING_LEVEL=info -e HYP_BASE_TRACING_FMT=pretty -e HYP_RELAYER_ORIGINCHAINNAME=anvil1 -e HYP_RELAYER_DESTINATIONCHAINNAMES=anvil2 -e HYP_RELAYER_ALLOWLOCALCHECKPOINTSYNCERS=true -e HYP_RELAYER_DB=/config/anvil1/relayer -e HYP_RELAYER_GASPAYMENTENFORCEMENT='[{"type":"none"}]' -e HYP_BASE_CHAINS_ANVIL2_SIGNER_TYPE=hexKey -e HYP_BASE_CHAINS_ANVIL2_SIGNER_KEY=0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97 gcr.io/abacus-labs-dev/hyperlane-agent:5bf8aed-20230323-140136 ./relayer
#docker run -it --mount type=bind,source="$(pwd)/artifacts",target=/config -e CONFIG_FILES=/config/agent_config.json -e HYP_BASE_CHAINS_ANVIL1_CONNECTION_URL=http://127.0.0.1:8545 -e HYP_BASE_CHAINS_ANVIL2_CONNECTION_URL=http://127.0.0.1:8555 -e HYP_BASE_TRACING_LEVEL=info -e HYP_BASE_TRACING_FMT=pretty -e HYP_RELAYER_ORIGINCHAINNAME=anvil2 -e HYP_RELAYER_DESTINATIONCHAINNAMES=anvil1 -e HYP_RELAYER_ALLOWLOCALCHECKPOINTSYNCERS=true -e HYP_RELAYER_DB=/config/anvil2/relayer -e HYP_RELAYER_GASPAYMENTENFORCEMENT='[{"type":"none"}]' -e HYP_BASE_CHAINS_ANVIL2_SIGNER_TYPE=hexKey -e HYP_BASE_CHAINS_ANVIL2_SIGNER_KEY=0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97 gcr.io/abacus-labs-dev/hyperlane-agent:5bf8aed-20230323-140136 ./relayer



#DEBUG=hyperlane* yarn ts-node scripts/test.ts --chains anvil1 anvil2 --key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --timeout 10

kill $ANVIL_1_PID
kill $ANVIL_2_PID
