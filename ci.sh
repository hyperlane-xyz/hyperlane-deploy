DEPLOYER_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
DEPLOYER_ADDRESS=0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266

GOERLI_RPC_PORT=8555
GOERLI_RPC_URL=http://127.0.0.1:$GOERLI_RPC_PORT

ANVIL_RPC_PORT=8545
ANVIL_RPC_URL=http://127.0.0.1:$ANVIL_RPC_PORT

AGENT_IMAGE=gcr.io/abacus-labs-dev/hyperlane-agent:40cc4a6-20230420-080111

for CHAIN in goerli anvil
do
    mkdir /tmp/$CHAIN \
    /tmp/$CHAIN/state \
    /tmp/$CHAIN/validator \
    /tmp/$CHAIN/relayer && \
    chmod 777 /tmp/$CHAIN -R
done

anvil -p $GOERLI_RPC_PORT --state /tmp/goerli/state --fork-url https://goerli.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161 > /dev/null &
sleep 3
# The deployer will need goerli funds
cast rpc --rpc-url $GOERLI_RPC_URL hardhat_setBalance "$DEPLOYER_ADDRESS" "1000000000000000000"
GOERLI_PID=$!

anvil -p $ANVIL_RPC_PORT --state /tmp/anvil/state --chain-id 31337 > /dev/null &
ANVIL_PID=$!

sleep 1

set -e

echo "Deploying hyperlane to anvil"
GOERLI_RPC_URL_OVERRIDE=$GOERLI_RPC_URL \
  yarn ts-node scripts/deploy-hyperlane.ts --local anvil --remotes goerli \
  --key $DEPLOYER_KEY

echo "Deploying warp routes"
GOERLI_RPC_URL_OVERRIDE=$GOERLI_RPC_URL \
  yarn ts-node scripts/deploy-warp-routes.ts \
  --key $DEPLOYER_KEY

echo "Running validator on anvil"
# Won't work on anything but linux due to -net=host
docker run --mount type=bind,source="$(pwd)/artifacts",target=/config \
  --mount type=bind,source="/tmp",target=/data --net=host \
  -e CONFIG_FILES=/config/agent_config.json -e HYP_VALIDATOR_ORIGINCHAINNAME=anvil \
  -e HYP_VALIDATOR_REORGPERIOD=0 -e HYP_VALIDATOR_INTERVAL=1 \
  -e HYP_BASE_CHAINS_ANVIL_CONNECTION_URL=$ANVIL_RPC_URL \
  -e HYP_VALIDATOR_VALIDATOR_TYPE=hexKey \
  -e HYP_VALIDATOR_VALIDATOR_KEY=0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6 \
  -e HYP_VALIDATOR_CHECKPOINTSYNCER_TYPE=localStorage \
  -e HYP_VALIDATOR_CHECKPOINTSYNCER_PATH=/data/anvil/validator \
  -e HYP_BASE_TRACING_LEVEL=info -e HYP_BASE_TRACING_FMT=pretty \
  $AGENT_IMAGE ./validator &
sleep 10

echo "Announcing validator on anvil"
VALIDATOR_ANNOUNCE_ADDRESS=$(cat ./artifacts/addresses.json | jq -r ".anvil.validatorAnnounce")
VALIDATOR=$(cat /tmp/anvil/validator/announcement.json | jq -r '.value.validator')
STORAGE_LOCATION=$(cat /tmp/anvil/validator/announcement.json | jq -r '.value.storage_location')
SIGNATURE=$(cat /tmp/anvil/validator/announcement.json | jq -r '.serialized_signature')
cast send $VALIDATOR_ANNOUNCE_ADDRESS  \
  "announce(address, string calldata, bytes calldata)(bool)" \
  $VALIDATOR $STORAGE_LOCATION $SIGNATURE --rpc-url $ANVIL_RPC_URL \
  --private-key 0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba


for i in "goerli anvil ANVIL" "anvil goerli GOERLI"
do
    set -- $i
    echo "Running relayer on $1"
    docker run --mount type=bind,source="$(pwd)/artifacts",target=/config \
      --mount type=bind,source="/tmp",target=/data --net=host \
      -e CONFIG_FILES=/config/agent_config.json \
      -e HYP_BASE_CHAINS_ANVIL_CONNECTION_URL=$ANVIL_RPC_URL \
      -e HYP_BASE_CHAINS_GOERLI_CONNECTION_URL=$GOERLI_RPC_URL \
      -e HYP_BASE_TRACING_LEVEL=info -e HYP_BASE_TRACING_FMT=pretty \
      -e HYP_RELAYER_ORIGINCHAINNAME=$1 -e HYP_RELAYER_DESTINATIONCHAINNAMES=$2 \
      -e HYP_RELAYER_ALLOWLOCALCHECKPOINTSYNCERS=true -e HYP_RELAYER_DB=/data/$1/relayer \
      -e HYP_RELAYER_GASPAYMENTENFORCEMENT='[{"type":"none"}]' \
      -e HYP_BASE_CHAINS_${3}_SIGNER_TYPE=hexKey \
      -e HYP_BASE_CHAINS_${3}_SIGNER_KEY=0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97 \
      $AGENT_IMAGE ./relayer &
done

echo "Testing message sending"
GOERLI_RPC_URL_OVERRIDE=$GOERLI_RPC_URL \
  yarn ts-node scripts/test-messages.ts --chains goerli anvil \
  --key $DEPLOYER_KEY \
  --timeout 60

echo "Sending a test warp transfer"
GOERLI_RPC_URL_OVERRIDE=$GOERLI_RPC_URL \
  yarn ts-node scripts/test-warp-transfer.ts \
  --origin goerli --destination anvil --wei 1 \
  --recipient $DEPLOYER_ADDRESS \
  --key $DEPLOYER_KEY \
  --timeout 60

docker ps -aq | xargs docker stop | xargs docker rm
kill $GOERLI_PID
kill $ANVIL_PID
