anvil --chain-id 31337 -p 8545 > /dev/null &
anvil --chain-id 31338 -p 8555 > /dev/null &
DEBUG=hyperlane* yarn ts-node scripts/deploy.ts --local anvil1 --remotes anvil2 --key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --no-write-agent-config
DEBUG=hyperlane* yarn ts-node scripts/deploy.ts --local anvil2 --remotes anvil1 --key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
DEBUG=hyperlane* yarn ts-node scripts/test.ts --chains anvil1 anvil2 --key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --timeout 10
