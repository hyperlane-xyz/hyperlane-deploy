for CHAIN in anvil1 anvil2
do
    mkdir ./artifacts/$CHAIN ./artifacts/$CHAIN/state \
      ./artifacts/$CHAIN/validator ./artifacts/$CHAIN/relayer
    chmod 777 ./artifacts/$CHAIN -R
done

anvil --chain-id 31337 -p 8545 --state ./artifacts/anvil1/state > /dev/null &
ANVIL_1_PID=$!

anvil --chain-id 31338 -p 8555 --state ./artifacts/anvil2/state > /dev/null &
ANVIL_2_PID=$!

sleep 1

set -e

for i in "anvil1 anvil2 --no-write-agent-config" "anvil2 anvil1 --write-agent-config"
do
    set -- $i
    echo "Deploying contracts to $1"
    DEBUG=hyperlane* yarn ts-node scripts/deploy-hyperlane.ts --local $1 --remotes $2 \
    --key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 $3
done

yarn run build

echo "Deploying warp routes"
DEBUG=hyperlane* yarn ts-node scripts/deploy-warp-routes.ts \
  --key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

echo "Sending a test warp transfer"
DEBUG=hyperlane* yarn ts-node scripts/test-warp-transfer.ts \
  --origin anvil1 --destination anvil2 --wei 1 --recipient 0xac0974bec39a17e36ba4a6b4d238ff944bacb4a5 \
  --key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80


docker ps -aq | xargs docker stop | xargs docker rm
kill $ANVIL_1_PID
kill $ANVIL_2_PID
