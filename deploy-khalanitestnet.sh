# Deployer private key. All the ownerships are transferred to the owner (specified in `networks.json`) after deployment.
export PRIVATE_KEY=<PRIVATE_KEY>

# We deploy to Khalani Chain
export LOCAL=khalanitestnet
export RPC_URL=https://www.axon-node.info

# Chains that will receive messages from Khalani chain
export REMOTES=goerli,fuji

forge script scripts/DeployCore.s.sol --broadcast --rpc-url $RPC_URL --private-key $PRIVATE_KEY --legacy